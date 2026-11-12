const fs = require("node:fs");
const path = require("node:path");
const { projectRoot } = require("./config");
const { loadSources, createLookup } = require("./data");

function findReferences(text) {
    // 把參見「...、也作「... 找出來。
    const pattern =
        /(參見|也作|(?<![\p{L}\p{N}])同)\s*((?:「[^」]+」|【[^】]+】)(?:[、，]\s*(?:「[^」]+」|【[^】]+】))*)/gu;
    const references = [];

    for (const match of text.matchAll(pattern)) {
        const kind = match[1];
        for (const target of match[2].matchAll(/「([^」]+)」|【([^】]+)】/gu)) {
            references.push({
                kind,
                target: target[1] || target[2],
                expand: kind !== "也作",
                original: match[0],
            });
        }
    }

    return references;
}

function collectReferences(
    data,
    source,
    { singleCharactersOnly = false } = {},
) {
    const report = [];
    const singleCharacters = singleCharactersOnly
        ? new Set(data.singleCharacters)
        : null;
    // 完整盤點可包含多字詞；查無目標報告則只以可用的單字字頭為起點。
    for (const entries of data.byTitle.values()) {
        for (const entry of entries) {
            if (singleCharacters && !singleCharacters.has(entry)) continue;
            for (const [pronunciationIndex, pronunciation] of (
                entry.heteronyms || []
            ).entries()) {
                for (const [definitionIndex, definition] of (
                    pronunciation.definitions || []
                ).entries()) {
                    const seen = new Set();
                    // 不在例句或古籍引文中推斷轉介，保留欄位方便人工檢查。
                    const fields = [
                        ["def", definition.def || ""],
                        ...(definition.link || []).map((text, index) => [
                            `link[${index}]`,
                            text,
                        ]),
                    ];
                    for (const [field, text] of fields) {
                        const references = findReferences(text);
                        for (const reference of references) {
                            const duplicate =
                                reference.expand && seen.has(reference.target);
                            if (reference.expand) seen.add(reference.target);
                            report.push({
                                source,
                                title: entry.title,
                                pronunciationIndex,
                                definitionIndex,
                                bopomofo: pronunciation.bopomofo || "",
                                pinyin: pronunciation.pinyin || "",
                                field,
                                text,
                                ...reference,
                                action: !reference.expand
                                    ? "不展開"
                                    : duplicate
                                      ? "同筆釋義重複，略過"
                                      : "待展開",
                            });
                        }
                        // 候選也必須有引用括號，不能只憑「參見／也作／同」字樣。
                        if (
                            /(?:參見|也作|(?<![\p{L}\p{N}])同)\s*[「【]/u.test(
                                text,
                            ) &&
                            references.length === 0
                        ) {
                            report.push({
                                source,
                                title: entry.title,
                                pronunciationIndex,
                                definitionIndex,
                                field,
                                text,
                                action: "未辨識，待人工檢查",
                            });
                        }
                    }
                }
            }
        }
    }
    return report;
}

// 先依原始欄位決定展開，再由顯示程式把空 def 的 link 提升為正文。
function planDefinitionReferences(definition) {
    const hasDescription = !!(definition.def || "").trim();
    const hasSupportingContent = ["example", "quote"].some((field) =>
        (definition[field] || []).some((value) => value.trim()),
    );
    const candidates = [];
    if (/^參見\s*[「【]/u.test((definition.def || "").trim())) {
        candidates.push(
            ...findReferences(definition.def)
                .filter((ref) => ref.kind === "參見")
                .map((ref) => ({ ...ref, text: definition.def, field: "def" })),
        );
    }
    for (const [index, text] of (definition.link || []).entries()) {
        const refs = findReferences(text);
        const seeFirst = refs.some((ref) => ref.kind === "參見");
        candidates.push(
            ...refs
                .filter((ref) =>
                    seeFirst
                        ? ref.kind === "參見"
                        : ref.kind === "同" &&
                          !hasDescription &&
                          !hasSupportingContent,
                )
                .map((ref) => ({ ...ref, text, field: `link[${index}]` })),
        );
    }
    const seen = new Set();
    const result = candidates.filter((ref) => {
        if (seen.has(ref.target)) return false;
        seen.add(ref.target);
        return true;
    });
    const multiple = new Set(result.map((ref) => ref.target)).size > 1;
    return result.map((ref) => ({ ...ref, forceTitle: multiple }));
}

// 為設計預覽與實機 sample 選取有語境依據的引用讀音，不改寫來源。
function selectReferenceGroups(
    groups,
    { sourceTitle, pronunciation, target, text, requireMatch = false },
) {
    // 原文序號不等於 JSON 排序；保留原文，不拿序號選擇讀音。
    const positions =
        [...target].length === 1
            ? [0]
            : [...target].flatMap((char, index) =>
                  char === sourceTitle ? [index] : [],
              );
    const syllables = (value) =>
        (value || "")
            .trim()
            .split(/[\s\u3000]+/u)
            .filter(Boolean);
    const variants = (value) =>
        (value || "")
            .split(/<br\s*\/?\s*>/i)
            .map((part) => syllables(part.replace(/^[臺陸]⃝/, "")));
    return groups.flatMap((group) => {
        const total = group.entries.reduce(
            (n, entry) => n + (entry.heteronyms || []).length,
            0,
        );
        if (total <= 1 && !requireMatch) return [group];
        const entries = group.entries.flatMap((entry) => {
            const heteronyms = (entry.heteronyms || []).filter((item) => {
                if (!positions.length) return total === 1;
                const field =
                    pronunciation.bopomofo && item.bopomofo
                        ? "bopomofo"
                        : "pinyin";
                const source = variants(pronunciation[field])
                    .filter((parts) => parts.length === 1)
                    .map((parts) => parts[0]);
                if (!source.length) return false;
                return variants(item[field]).some(
                    (parts) =>
                        parts.length === [...target].length &&
                        positions.every((position) =>
                            source.includes(parts[position]),
                        ),
                );
            });
            return heteronyms.length ? [{ ...entry, heteronyms }] : [];
        });
        return entries.length
            ? [{ ...group, entries }]
            : requireMatch
              ? []
              : [group];
    });
}

function collectAdoptedReferences(data) {
    const lookup = createLookup(data);
    // 只檢查會採用的輔助內容，不檢查被教育部內容取代的條目。
    const adoptedAuxiliaryTitles = new Set(
        (data.auxiliary?.singleCharacters || [])
            .filter((entry) =>
                lookup(entry.title).some(
                    (group) =>
                        group.source === "auxiliary" &&
                        group.title === entry.title,
                ),
            )
            .map((entry) => entry.title),
    );
    return {
        primary: collectReferences(data.primary, "primary", {
            singleCharactersOnly: true,
        }),
        auxiliary: data.auxiliary
            ? collectReferences(data.auxiliary, "auxiliary", {
                  singleCharactersOnly: true,
              }).filter((reference) =>
                  adoptedAuxiliaryTitles.has(reference.title),
              )
            : [],
    };
}

if (require.main === module) {
    const data = loadSources("combined");
    const report = Object.entries(data).flatMap(([source, dictionary]) =>
        collectReferences(dictionary, source),
    );
    const filename = path.join(projectRoot, "output", "references.json");
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(report, null, 2), "utf8");
    console.log(`引用檢查清單：${filename}（${report.length} 筆）`);
}
module.exports = {
    findReferences,
    collectReferences,
    planDefinitionReferences,
    selectReferenceGroups,
    collectAdoptedReferences,
};
