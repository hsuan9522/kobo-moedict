const test = require("node:test");
const assert = require("node:assert/strict");
const orders = require("../data/reading-orders.json");
const {
    supplementReadings,
    sourceReadingNumber,
    readingNumberLabel,
    orderVariantDefinitions,
} = require("./readings");
const { normalizeEntry, organizeEntries, createLookup } = require("./data");

const variant = (title, target) => ({
    title,
    heteronyms: [{ definitions: [{ def: `「${target}」的異體字。` }] }],
});
test("借音跨鏈、去重且遇循環停止，不改原始讀音", () => {
    const first = variant("甲", "乙");
    const target = {
        title: "丙",
        heteronyms: [
            { bopomofo: "音一", pinyin: "one", definitions: [] },
            { bopomofo: "音二", pinyin: "two", definitions: [] },
            { bopomofo: "音一", pinyin: "one", definitions: [] },
            ...variant("丙", "甲").heteronyms,
        ],
    };
    const lookup = createLookup({
        primary: organizeEntries([first, variant("乙", "丙"), target]),
        auxiliary: null,
    });
    const result = supplementReadings(normalizeEntry(first), lookup);
    assert.equal(result.heteronyms[0].borrowedReadings.bopomofo, "音一/音二");
    assert.equal(result.heteronyms[0].bopomofo, "");
    assert.equal(first.heteronyms[0].bopomofo, undefined);
});
test("純繁體不能借用輔助來源；本身有音不覆寫", () => {
    const first = variant("甲", "乙"),
        primary = organizeEntries([first]);
    const auxiliary = organizeEntries([
        { title: "乙", heteronyms: [{ bopomofo: "音", definitions: [] }] },
    ]);
    assert.equal(
        supplementReadings(
            normalizeEntry(first),
            createLookup({ primary, auxiliary: null }),
        ).heteronyms[0].borrowedReadings.bopomofo,
        "",
    );
    assert.equal(
        supplementReadings(
            normalizeEntry(first),
            createLookup({ primary, auxiliary }),
        ).heteronyms[0].borrowedReadings.bopomofo,
        "音",
    );
    const voiced = {
        ...first,
        heteronyms: [{ ...first.heteronyms[0], bopomofo: "本音" }],
    };
    assert.equal(
        supplementReadings(
            normalizeEntry(voiced),
            createLookup({ primary, auxiliary }),
        ).heteronyms[0].borrowedReadings,
        undefined,
    );
});

test("依原始 Excel 編號，不以 JSON 位置推定", () => {
    for (const [title, b, expected] of [
        ["什", "ㄕㄣˊ", 2],
        ["什", "ㄕㄜˊ", 3],
        ["俱", "ㄐㄩˋ", 1],
        ["俱", "ㄐㄩ", 2],
        ["行", "ㄒㄧㄥˊ", 1],
        ["行", "ㄏㄤˋ", 4],
    ])
        assert.equal(
            sourceReadingNumber(title, { bopomofo: b }, orders),
            expected,
        );
    assert.equal(sourceReadingNumber("峯", { bopomofo: "ㄈㄥ" }, orders), null);
    assert.equal(readingNumberLabel(1), "㈠");
    assert.equal(readingNumberLabel(2), "㈡");
});

test("跨讀音先實義後異體字，混合組別拆分但保留原讀音及來源", () => {
    const entries = [
        {
            title: "甲",
            heteronyms: [
                {
                    bopomofo: "ㄐㄧㄚˇ",
                    definitions: [
                        { def: "「乙」的異體字。" },
                        { def: "第一義。" },
                    ],
                },
                {
                    bopomofo: "ㄍㄚ",
                    definitions: [
                        { def: "第二義。" },
                        { def: "「丙」的異體字。" },
                    ],
                },
            ],
        },
    ];
    const original = JSON.stringify(entries);
    const result = orderVariantDefinitions(entries);
    assert.deepEqual(
        result.map((e) => e.heteronyms[0].definitions[0].def),
        ["第一義。", "第二義。", "「乙」的異體字。", "「丙」的異體字。"],
    );
    assert.deepEqual(
        result.map((e) => e.heteronyms[0].bopomofo),
        ["ㄐㄧㄚˇ", "ㄍㄚ", "ㄐㄧㄚˇ", "ㄍㄚ"],
    );
    assert.ok(result.every((e) => e.title === "甲"));
    assert.equal(JSON.stringify(entries), original);
});
