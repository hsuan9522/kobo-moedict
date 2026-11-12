const fs = require("node:fs");
const { sources } = require("./config");

// 只加入有可靠來源確認的對照；來源圖片編號不能直接當作 Unicode 碼。
const verifiedGlyphs = {};
const codePattern = /\{\[[^\]]+\]\}|&[^\s"<>;]*\.gif;/gi;

function prepareGlyphs(entries, mapping = verifiedGlyphs) {
    const report = [];
    const prepared = [];

    for (const entry of entries) {
        let unresolvedTitle = false;
        function replace(text, location) {
            return text.replace(codePattern, (code) => {
                const replacement = Object.hasOwn(mapping, code)
                    ? mapping[code]
                    : null;
                const inTitle = location === "title";
                if (!replacement && inTitle) unresolvedTitle = true;
                report.push({
                    title: entry.title,
                    location,
                    code,
                    replacement: replacement || (inTitle ? null : "☒"),
                    action: replacement
                        ? "已還原"
                        : inTitle
                          ? "略過字頭"
                          : "內文替換缺字符號",
                    original: text,
                });
                return replacement || "☒";
            });
        }

        const title = replace(entry.title, "title");
        // 未解決的字頭不建立索引，也不作為引用目標。
        if (unresolvedTitle) continue;

        function transform(value, location) {
            if (typeof value === "string") return replace(value, location);
            if (Array.isArray(value))
                return value.map((item, index) =>
                    transform(item, `${location}[${index}]`),
                );
            if (value && typeof value === "object") {
                return Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [
                        key,
                        transform(item, location ? `${location}.${key}` : key),
                    ]),
                );
            }
            return value;
        }
        prepared.push(
            Object.fromEntries(
                Object.entries(entry).map(([key, value]) => [
                    key,
                    key === "title" ? title : transform(value, key),
                ]),
            ),
        );
    }

    return { entries: prepared, report };
}

// Build indexes while preserving all original records.
function organizeEntries(entries) {
    if (!Array.isArray(entries)) {
        throw new Error("字典資料必須是 JSON 陣列");
    }

    const singleCharacters = [];
    const unresolvedTitles = [];
    const byTitle = new Map();

    for (const entry of entries) {
        if (typeof entry.title !== "string" || !entry.title) {
            throw new Error("字典條目缺少有效的 title");
        }

        // 建立例如： "線": [{線1字典物件}, {線2字典物件}, ...] 的對照表，方便後續查詢。
        const matches = byTitle.get(entry.title) || [];
        matches.push(entry);
        byTitle.set(entry.title, matches);

        if (/\{\[[^\]]+\]\}|&[^\s;]*\.gif;/i.test(entry.title)) {
            // 待字形對照處理後，再判斷是否可作為單字字頭。因為有些是編碼，只能用圖片顯示，那這樣還建立的話意義不大。
            unresolvedTitles.push(entry);
        } else if ([...entry.title].length === 1) {
            singleCharacters.push(entry);
        }
    }

    // 不改寫原始 heteronyms、alt、釋義或讀音，留給後續規則處理。
    return { singleCharacters, unresolvedTitles, byTitle };
}

function readDictionary(filename) {
    try {
        const entries = JSON.parse(fs.readFileSync(filename, "utf8"));
        const prepared = prepareGlyphs(entries);
        return {
            ...organizeEntries(prepared.entries),
            glyphReport: prepared.report,
        };
    } catch (error) {
        throw new Error(`讀取字典失敗：${filename}：${error.message}`, {
            cause: error,
        });
    }
}

function loadSources(mode) {
    if (mode !== "traditional" && mode !== "combined") {
        throw new Error(`不支援的字典模式：${mode}`);
    }

    return {
        primary: readDictionary(sources.primary),
        auxiliary:
            mode === "combined" ? readDictionary(sources.auxiliary) : null,
    };
}

function selectCharacters({ primary, auxiliary }) {
    const titles = new Set(
        primary.singleCharacters.map((entry) => entry.title),
    );
    const byAlternate = new Map();

    if (auxiliary) {
        for (const entry of auxiliary.singleCharacters) {
            titles.add(entry.title);
            for (const pronunciation of entry.heteronyms || []) {
                const alternate = pronunciation.alt;
                if (
                    typeof alternate !== "string" ||
                    [...alternate].length !== 1
                )
                    continue;
                titles.add(alternate);
                const matches = byAlternate.get(alternate) || new Set();
                matches.add(entry.title);
                byAlternate.set(alternate, matches);
            }
        }
    }

    return [...titles].map((title) => {
        const corresponding = new Set();
        // 自身有教育部釋義時先列自身，再列其他繁體對應。
        if (primary.byTitle.has(title)) corresponding.add(title);
        for (const target of byAlternate.get(title) || [])
            corresponding.add(target);
        // 有繁體對應時，不採用簡體原字頭的輔助釋義。
        if (corresponding.size === 0) corresponding.add(title);

        const groups = [...corresponding].map((target) => {
            const preferred = primary.byTitle.get(target);
            return {
                title: target,
                source: preferred ? "primary" : "auxiliary",
                entries: preferred || auxiliary.byTitle.get(target),
            };
        });
        return { title, groups };
    });
}

function createLookup({ primary, auxiliary }) {
    const byAlternate = new Map();

    // 反向建立「线 → 線」等對照，所有讀音的 alt 都要檢查。
    if (auxiliary) {
        for (const entries of auxiliary.byTitle.values()) {
            for (const entry of entries) {
                for (const pronunciation of entry.heteronyms || []) {
                    const alternate = pronunciation.alt;
                    if (typeof alternate !== "string" || !alternate) continue;
                    const titles = byAlternate.get(alternate) || new Set();
                    titles.add(entry.title);
                    byAlternate.set(alternate, titles);
                }
            }
        }
    }

    // 查找只回傳原始條目，不遞迴展開，不改寫來源。
    return function lookup(target) {
        const direct = primary.byTitle.get(target);
        if (direct)
            return [{ title: target, source: "primary", entries: direct }];
        if (!auxiliary) return [];

        const titles = byAlternate.get(target);
        if (titles) {
            return [...titles].map((title) => {
                const preferred = primary.byTitle.get(title);
                return {
                    title,
                    source: preferred ? "primary" : "auxiliary",
                    entries: preferred || auxiliary.byTitle.get(title),
                };
            });
        }

        const fallback = auxiliary.byTitle.get(target);
        return fallback
            ? [{ title: target, source: "auxiliary", entries: fallback }]
            : [];
    };
}

// 兩份資料使用相同欄位，先共用整理方式，不在這裡決定來源或合併字頭。
function normalizeEntry(entry) {
    return {
        ...entry,
        heteronyms: (entry.heteronyms || []).map((pronunciation) => ({
            ...pronunciation,
            bopomofo: pronunciation.bopomofo || "",
            pinyin: pronunciation.pinyin || "",
            definitions: (pronunciation.definitions || []).map(
                (definition) => ({
                    ...definition,
                    // 沿用原程式的顯示順序；原始欄位保留供引用辨識及報告使用。
                    text:
                        (definition.def || "") +
                        (definition.example || []).join("") +
                        (definition.quote || []).join("") +
                        (definition.link || []).join(""),
                }),
            ),
        })),
    };
}

module.exports = {
    prepareGlyphs,
    organizeEntries,
    readDictionary,
    loadSources,
    selectCharacters,
    createLookup,
    normalizeEntry,
};
