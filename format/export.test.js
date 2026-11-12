const assert = require("node:assert/strict");
const test = require("node:test");
const { organizeEntries } = require("./data");
const { createRows, serializeCsv } = require("./export");

test("CSV 正確跳脫逗號、雙引號及換行，不輸出假字頭標頭", () => {
    const csv = serializeCsv([{ title: "字", html: '例："甲,乙"\n下一行' }]);
    assert.equal(csv, '字,"例：""甲,乙""\n下一行"\n');
    assert.equal(serializeCsv([]), "");
});

test("從來源到 HTML 保留單字、引用多字詞與繁簡優先規則", () => {
    const primary = organizeEntries([
        {
            title: "線",
            heteronyms: [
                {
                    bopomofo: "ㄒㄧㄢˋ",
                    pinyin: "xiàn",
                    definitions: [{ def: "參見「線條」。" }],
                },
            ],
        },
        {
            title: "線條",
            heteronyms: [
                { bopomofo: "詞音", definitions: [{ def: "引用詞解釋。" }] },
            ],
        },
    ]);
    const auxiliary = organizeEntries([
        {
            title: "線",
            heteronyms: [
                { alt: "线", definitions: [{ def: "不應使用的輔助義。" }] },
            ],
        },
    ]);
    const pure = createRows({ primary, auxiliary: null }, "bopomofo");
    assert.deepEqual(
        pure.map((row) => row.title),
        ["線"],
    );
    assert.ok(pure[0].html.includes("引用詞解釋。"));
    const combined = createRows({ primary, auxiliary }, "pinyin");
    assert.deepEqual(
        combined.map((row) => row.title),
        ["線", "线"],
    );
    const simplified = combined[1].html;
    assert.ok(simplified.includes("﹝線﹞"));
    assert.ok(simplified.includes("xiàn"));
    assert.ok(simplified.includes("引用詞解釋。"));
    assert.ok(!simplified.includes("不應使用的輔助義。"));
});
