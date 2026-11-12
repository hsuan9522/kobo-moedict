const test = require("node:test");
const assert = require("node:assert/strict");
const {
    prepareGlyphs,
    organizeEntries,
    createLookup,
    normalizeEntry,
    selectCharacters,
    loadSources,
} = require("./data");
const { collectAdoptedReferences } = require("./references");

test("擴充漢字屬於單字，多字詞仍可供引用查找", () => {
    const entries = ["字", "𠀍", "閱讀"].map((title) => ({
        title,
        heteronyms: [],
    }));
    const data = organizeEntries(entries);

    assert.deepEqual(
        data.singleCharacters.map((entry) => entry.title),
        ["字", "𠀍"],
    );
    assert.equal(data.byTitle.get("閱讀")[0], entries[2]);
});

test("字形代碼獨立保留，不誤收為單字或直接丟棄", () => {
    const entries = ["{[8ff0]}", "{[8ff0]}族", "&8ff0._104_0.gif;"].map(
        (title) => ({ title, heteronyms: [] }),
    );
    const data = organizeEntries(entries);

    assert.equal(data.singleCharacters.length, 0);
    assert.deepEqual(data.unresolvedTitles, entries);
    assert.equal(data.byTitle.get("{[8ff0]}")[0], entries[0]);
});

test("同字頭的不同條目不互相覆蓋，原始讀音和對應資訊保留", () => {
    const entries = [
        { title: "線", heteronyms: [{ alt: "线", bopomofo: "ㄒㄧㄢˋ" }] },
        { title: "線", heteronyms: [{ alt: "缐", bopomofo: "ㄒㄧㄢˋ" }] },
    ];
    const before = JSON.stringify(entries);
    const data = organizeEntries(entries);

    assert.deepEqual(data.byTitle.get("線"), entries);
    assert.equal(JSON.stringify(entries), before);
});

test("不合法的資料或模式應明確報錯", () => {
    assert.throws(() => organizeEntries({}), /JSON 陣列/);
    assert.throws(() => organizeEntries([{ title: "" }]), /title/);
    assert.throws(() => loadSources("unknown"), /不支援/);
});

test("有可靠對照才能還原；還原後再判斷字頭長度，保留擴充漢字", () => {
    const result = prepareGlyphs(
        [{ title: "{[test]}" }, { title: "{[test]}詞" }],
        { "{[test]}": "𠀍" },
    );
    const data = organizeEntries(result.entries);
    assert.deepEqual(
        data.singleCharacters.map((x) => x.title),
        ["𠀍"],
    );
    assert.ok(data.byTitle.has("𠀍詞"));
    assert.ok(result.report.every((x) => x.action === "已還原"));
});

test("未解決字頭略過，不能把圖片編號當作 Unicode", () => {
    const result = prepareGlyphs([
        { title: "{[8ff0]}" },
        { title: "&unknown_.gif;" },
        { title: "述" },
    ]);
    assert.deepEqual(
        result.entries.map((x) => x.title),
        ["述"],
    );
    assert.equal(
        result.report.filter((x) => x.action === "略過字頭").length,
        2,
    );
});

test("內文各欄位代碼以 ☒ 替換並記錄位置，不改原始資料", () => {
    const original = [
        {
            title: "字",
            heteronyms: [
                {
                    definitions: [
                        {
                            def: "甲{[code]}乙",
                            quote: ["引&unknown_.gif;文"],
                            example: ["原例句"],
                        },
                    ],
                },
            ],
        },
    ];
    const before = JSON.stringify(original);
    const result = prepareGlyphs(original);
    const definition = result.entries[0].heteronyms[0].definitions[0];
    assert.equal(definition.def, "甲☒乙");
    assert.equal(definition.quote[0], "引☒文");
    assert.deepEqual(definition.example, ["原例句"]);
    assert.equal(
        result.report[1].location,
        "heteronyms[0].definitions[0].quote[0]",
    );
    assert.equal(JSON.stringify(original), before);
});

function entry(title, alt) {
    return {
        title,
        heteronyms: [
            {
                alt,
                bopomofo: "音",
                pinyin: "yin",
                definitions: [{ def: title + "義" }],
            },
        ],
    };
}

test("一簡對多繁逐字選來源、自身優先、查繁體不混入其他字", () => {
    const data = {
        primary: organizeEntries([entry("發"), entry("后"), entry("後")]),
        auxiliary: organizeEntries([
            entry("發", "发"),
            entry("髮", "发"),
            entry("后"),
            entry("後", "后"),
        ]),
    };
    const characters = new Map(selectCharacters(data).map((x) => [x.title, x]));
    assert.deepEqual(
        characters.get("发").groups.map((x) => [x.title, x.source]),
        [
            ["發", "primary"],
            ["髮", "auxiliary"],
        ],
    );
    assert.deepEqual(
        characters.get("后").groups.map((x) => x.title),
        ["后", "後"],
    );
    assert.deepEqual(
        characters.get("發").groups.map((x) => x.title),
        ["發"],
    );
});

test("簡體自身的輔助釋義不取代繁體教育部內容，純繁體不增加字頭", () => {
    const primary = organizeEntries([entry("線"), entry("閱讀")]);
    const data = {
        primary,
        auxiliary: organizeEntries([
            entry("线"),
            { title: "線", heteronyms: [{ alt: "线" }, { alt: "缐" }] },
            entry("腈"),
        ]),
    };
    const characters = selectCharacters(data);
    assert.deepEqual(
        characters
            .find((x) => x.title === "线")
            .groups.map((x) => [x.title, x.source]),
        [["線", "primary"]],
    );
    assert.equal(
        characters.find((x) => x.title === "缐").groups[0].title,
        "線",
    );
    assert.equal(
        characters.find((x) => x.title === "腈").groups[0].source,
        "auxiliary",
    );
    assert.ok(!characters.some((x) => x.title === "閱讀"));
    assert.deepEqual(
        selectCharacters({ primary, auxiliary: null }).map((x) => x.title),
        ["線"],
    );
});

function lookupEntry(title, alt) {
    return {
        title,
        heteronyms: [{ alt, definitions: [{ def: title + "的解釋" }] }],
    };
}

test("引用報告排除被教育部原字頭或繁體對應取代的輔助內容", () => {
    const auxiliaryEntry = (title) => ({
        title,
        heteronyms: [
            {
                definitions: [{ def: "同「查無此詞」。" }],
            },
        ],
    });
    const data = {
        primary: organizeEntries([lookupEntry("逗"), lookupEntry("線")]),
        auxiliary: organizeEntries([
            auxiliaryEntry("逗"),
            auxiliaryEntry("线"),
            lookupEntry("線", "线"),
            auxiliaryEntry("腈"),
        ]),
    };
    const report = collectAdoptedReferences(data);
    assert.deepEqual(
        report.auxiliary.map((x) => x.title),
        ["腈"],
    );
    assert.deepEqual(
        collectAdoptedReferences({ ...data, auxiliary: null }).auxiliary,
        [],
    );
});

test("純繁體不使用輔助資料；多字參見目標可以找到", () => {
    const lookup = createLookup({
        primary: organizeEntries([lookupEntry("線"), lookupEntry("閱讀")]),
        auxiliary: null,
    });
    assert.equal(lookup("閱讀")[0].source, "primary");
    assert.deepEqual(lookup("线"), []);
    assert.deepEqual(lookup("不存在"), []);
});

test("教育部字頭即使只有異體字說明也優先，不補輔助義項", () => {
    const primary = {
        title: "甲",
        heteronyms: [{ definitions: [{ def: "「乙」的異體字。" }] }],
    };
    const lookup = createLookup({
        primary: organizeEntries([primary]),
        auxiliary: organizeEntries([lookupEntry("甲")]),
    });
    assert.equal(lookup("甲")[0].entries[0], primary);
});

test("簡體先找繁體教育部內容，一簡對多繁逐字補缺且不重複", () => {
    const lookup = createLookup({
        primary: organizeEntries([lookupEntry("發")]),
        auxiliary: organizeEntries([
            { title: "發", heteronyms: [{ alt: "发" }, { alt: "发" }] },
            lookupEntry("髮", "发"),
            lookupEntry("腈"),
        ]),
    });
    assert.deepEqual(
        lookup("发").map((x) => [x.title, x.source]),
        [
            ["發", "primary"],
            ["髮", "auxiliary"],
        ],
    );
    assert.equal(lookup("腈")[0].source, "auxiliary");
});

test("所有讀音項的 alt 都能查找；查繁體本身不混入其他對應字", () => {
    const lookup = createLookup({
        primary: organizeEntries([lookupEntry("線")]),
        auxiliary: organizeEntries([
            {
                title: "線",
                heteronyms: [{ alt: "线" }, { alt: "缐" }],
            },
        ]),
    });
    assert.equal(lookup("缐")[0].title, "線");
    assert.equal(lookup("线")[0].source, "primary");
    assert.deepEqual(
        lookup("線").map((x) => x.title),
        ["線"],
    );
});

test("保留原始讀音、地區標示及釋義，不額外刪除括號", () => {
    const result = normalizeEntry({
        title: "字",
        heteronyms: [
            {
                bopomofo: "ㄗˋ（說明）<br>陸⃝ㄗˋ（另一說明）",
                pinyin: "zì（說明）",
                definitions: [{ def: "解釋（補充）。" }],
            },
        ],
    });

    assert.equal(
        result.heteronyms[0].bopomofo,
        "ㄗˋ（說明）<br>陸⃝ㄗˋ（另一說明）",
    );
    assert.equal(result.heteronyms[0].pinyin, "zì（說明）");
    assert.equal(result.heteronyms[0].definitions[0].text, "解釋（補充）。");
});

test("各讀音保有自己的釋義，原始資料與繁簡對應不變", () => {
    const entry = {
        title: "字",
        heteronyms: [
            {
                bopomofo: "讀音一",
                alt: "對應字",
                definitions: [
                    {
                        def: "解釋一。",
                        type: "名",
                        example: ["例一。", "例二。"],
                        quote: ["引用。"],
                        link: ["參見「某詞」。"],
                    },
                ],
            },
            { bopomofo: "讀音二", definitions: [{ def: "解釋二。" }] },
        ],
    };
    const before = JSON.stringify(entry);
    const result = normalizeEntry(entry);

    assert.equal(
        result.heteronyms[0].definitions[0].text,
        "解釋一。例一。例二。引用。參見「某詞」。",
    );
    assert.equal(result.heteronyms[0].definitions[0].type, "名");
    assert.equal(result.heteronyms[0].alt, "對應字");
    assert.equal(result.heteronyms[1].definitions[0].text, "解釋二。");
    assert.deepEqual(result.heteronyms[0].definitions[0].link, [
        "參見「某詞」。",
    ]);
    assert.equal(JSON.stringify(entry), before);
});

test("沒有讀音的異體字保留釋義，讀音以空字串表示", () => {
    const result = normalizeEntry({
        title: "𠀍",
        heteronyms: [{ definitions: [{ def: "「世」的異體字。" }] }],
    });

    assert.equal(result.heteronyms[0].bopomofo, "");
    assert.equal(result.heteronyms[0].pinyin, "");
    assert.equal(result.heteronyms[0].definitions[0].text, "「世」的異體字。");
});
