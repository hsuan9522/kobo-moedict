const test = require("node:test");
const assert = require("node:assert/strict");
const {
    findReferences,
    collectReferences,
    planDefinitionReferences: plan,
    selectReferenceGroups,
} = require("./references");
const { organizeEntries, loadSources, createLookup } = require("./data");

test("單字報告保留多字引用目標，排除多字詞自身及未還原代碼的引用", () => {
    const data = organizeEntries([
        {
            title: "甲",
            heteronyms: [{ definitions: [{ def: "參見「乙丙」。" }] }],
        },
        { title: "𠀍", heteronyms: [{ definitions: [{ def: "同「世」。" }] }] },
        {
            title: "乙丙",
            heteronyms: [{ definitions: [{ def: "參見「丁戊」。" }] }],
        },
        {
            title: "{[8ff0]}",
            heteronyms: [{ definitions: [{ def: "參見「壯族」。" }] }],
        },
    ]);
    const report = collectReferences(data, "primary", {
        singleCharactersOnly: true,
    });
    assert.deepEqual(
        report.map((x) => [x.title, x.target]),
        [
            ["甲", "乙丙"],
            ["𠀍", "世"],
        ],
    );
    assert.equal(collectReferences(data, "primary").length, 4);
    assert.ok(data.byTitle.has("乙丙"));
});

test("辨識兩種引號、多個目標及不展開的也作", () => {
    const result = findReferences(
        "參見「甲」、「乙」條。同【丙】。也作「丁」。",
    );
    assert.deepEqual(
        result.map((x) => [x.kind, x.target, x.expand]),
        [
            ["參見", "甲", true],
            ["參見", "乙", true],
            ["同", "丙", true],
            ["也作", "丁", false],
        ],
    );
    assert.equal(findReferences("不同「甲」。相同「乙」。").length, 0);
});

test("同筆釋義跨欄位去重，不同釋義各自展開", () => {
    const data = organizeEntries([
        {
            title: "字",
            heteronyms: [
                {
                    definitions: [
                        { def: "參見「甲」。", link: ["同「甲」。"] },
                        { def: "參見「甲」。" },
                    ],
                },
            ],
        },
    ]);
    assert.deepEqual(
        collectReferences(data, "primary").map((x) => x.action),
        ["待展開", "同筆釋義重複，略過", "待展開"],
    );
});

test("不能辨識的參見保留原文供檢查，古籍引文不建立引用", () => {
    const data = organizeEntries([
        {
            title: "詞語",
            heteronyms: [
                {
                    definitions: [
                        { def: "參見「甲", quote: ["古籍：「參見「乙」。」"] },
                    ],
                },
            ],
        },
    ]);
    const report = collectReferences(data, "primary");
    assert.equal(report.length, 1);
    assert.equal(report[0].text, "參見「甲");
    assert.equal(report[0].action, "未辨識，待人工檢查");
});

test("一般敘述不列入候選，也不把不同及相同當作轉介", () => {
    const data = organizeEntries([
        {
            title: "字",
            heteronyms: [
                {
                    definitions: [
                        { def: "相互參見。" },
                        { def: "參見道安，聽講經文。" },
                        { def: "也作為樂曲的名稱。" },
                        { def: "不同「甲」。相同「乙」。" },
                    ],
                },
            ],
        },
    ]);
    assert.deepEqual(collectReferences(data, "primary"), []);
});

test("同只在 def、例句及引文皆無內容時從 link 展開", () => {
    assert.deepEqual(plan({ def: "同「甲」。" }), []);
    assert.deepEqual(plan({ def: "意思。", link: ["同「甲」。"] }), []);
    for (const def of [undefined, "", "  "])
        assert.deepEqual(
            plan({
                def,
                link: ["同「甲」。"],
                quote: ["  "],
                example: [""],
            }).map((x) => x.target),
            ["甲"],
        );
    for (const field of ["quote", "example"]) {
        assert.deepEqual(plan({ link: ["同「甲」。"], [field]: ["內容"] }), []);
        assert.deepEqual(
            plan({ link: ["同「甲」。參見「乙」。"], [field]: ["內容"] }).map(
                (ref) => ref.target,
            ),
            ["乙"],
        );
    }
});
test("同一 link 參見優先，其他 link 獨立判斷", () => {
    const p = plan({ def: "", link: ["同「甲」。參見「乙」。", "同「丙」。"] });
    assert.deepEqual(
        p.map((x) => x.target),
        ["乙", "丙"],
    );
    assert.ok(p.every((x) => x.forceTitle));
});
test("多目標保留標題、去重且保留順序，單目標不強制標題", () => {
    assert.deepEqual(
        plan({ link: ["同「甲」、「乙」。", "同「甲」。"] }).map((x) => [
            x.target,
            x.forceTitle,
        ]),
        [
            ["甲", true],
            ["乙", true],
        ],
    );
    assert.equal(plan({ link: ["同「甲」。"] })[0].forceTitle, false);
});

const lookup = createLookup(loadSources("combined"));
const select = (sourceTitle, reading, target, text) =>
    selectReferenceGroups(lookup(target), {
        sourceTitle,
        pronunciation: { bopomofo: reading },
        target,
        text,
    }).flatMap((group) => group.entries.flatMap((entry) => entry.heteronyms));

test("行行依主字讀音只取 hàng hàng，不混入其他釋義", () => {
    const result = select(
        "行",
        "ㄏㄤˋ",
        "行行",
        "參見「行行」、「樹行子」等條。",
    );
    assert.deepEqual(
        result.map((item) => item.bopomofo),
        ["ㄏㄤˋ ㄏㄤˋ"],
    );
    assert.equal(result[0].definitions[0].def, "剛強的樣子。");
});
test("樹行子只比對行的位置，伺候也依語境選音", () => {
    assert.deepEqual(
        select("行", "ㄏㄤˋ", "樹行子", "參見「樹行子」。").map(
            (x) => x.bopomofo,
        ),
        ["ㄕㄨˋ ㄏㄤˋ ˙ㄗ"],
    );
    assert.deepEqual(
        select("伺", "ㄙˋ", "伺候", "參見「伺候」。").map((x) => x.bopomofo),
        ["ㄙˋ ㄏㄡˋ"],
    );
});
test("單字異形轉介依讀音匹配，不使用原文序號作為 JSON 索引", () => {
    assert.deepEqual(
        select("偺", "ㄗㄚˊ", "咱", "同「咱」(二)。").map((x) => x.bopomofo),
        ["ㄗㄚˊ"],
    );
    assert.deepEqual(
        select("偺", "ㄗㄢˊ", "咱", "同「咱」(二)。").map((x) => x.bopomofo),
        ["ㄗㄢˊ"],
    );
    assert.deepEqual(
        select("偺", "ㄗㄢˊ", "咱", "同「咱」(一)。").map((x) => x.bopomofo),
        ["ㄗㄢˊ"],
    );
    assert.equal(select("偺", "ㄅㄚ", "咱", "同「咱」(二)。").length, 2);
});
test("多音無匹配時展開全部，單音不限制聲調或兒化格式", () => {
    assert.equal(select("行", "ㄅㄚ", "行行", "參見「行行」。").length, 3);
    assert.equal(select("字", "ㄗˋ", "行行", "參見「行行」。").length, 3);
    assert.ok(select("叭", "ㄅㄚ", "喇叭", "參見「喇叭」。").length);
    assert.ok(select("個", "ㄍㄜˋ", "個兒", "參見「個兒」。").length);
    assert.ok(select("喳", "ㄔㄚ", "喳喳", "參見「喳喳」。").length);
    assert.deepEqual(
        select("字", "ㄗˋ", "不存在的目標", "參見「不存在的目標」。"),
        [],
    );
});
