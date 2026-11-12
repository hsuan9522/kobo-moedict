const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSources, organizeEntries } = require("./data");
const { selectCharacters } = require("./data");
const { createLookup } = require("./data");
const { createRenderer } = require("./render");
const data = loadSources("combined");
const characters = new Map(selectCharacters(data).map((c) => [c.title, c]));
const render = createRenderer(createLookup(data));
const html = (title) => render(characters.get(title));

test("實機排版使用點號、無表格、斜線空白，並保留來源讀音編號", () => {
    const result = html("什");
    assert.ok(result.indexOf("㈡ ㄕㄣˊ") < result.indexOf("㈢ ㄕㄜˊ"));
    assert.ok(result.includes("(二)之又音。"));
    assert.ok(result.includes("<span>·</span>&nbsp;"));
    assert.ok(!result.includes("<table") && !result.includes("[其他]"));
    assert.ok(
        html("㕘").includes(
            "㈠ ㄘㄢ&nbsp;/&nbsp;㈡ ㄕㄣ&nbsp;/&nbsp;㈢ ㄘㄣ&nbsp;/&nbsp;㈣ ㄙㄢ",
        ),
    );
});
test("純無音異體字補音並省略分類及展開字頭；有實義則保留末尾異體組", () => {
    const pure = html("峯");
    assert.ok(pure.includes("ㄈㄥ") && pure.includes("「峰」的異體字。"));
    assert.ok(!pure.includes("[異體]") && !pure.includes("﹝峰﹞"));
    const mixed = html("圲");
    assert.ok(mixed.indexOf("用於地名") < mixed.indexOf("[異體]"));
    assert.equal(
        mixed.split("color:#555555;")[0].split("ㄑㄧㄢ").length - 1,
        1,
    );
});

test("混合條目的無音異體區以三個連字號與獨立標題分隔", () => {
    for (const field of ["bopomofo", "pinyin"]) {
        const result = render(characters.get("机"), field);
        const divider = result.indexOf("<div>---</div>");
        assert.ok(
            divider > result.indexOf(field === "bopomofo" ? "ㄐㄧˇ" : "jǐ"),
        );
        assert.ok(result.slice(divider).includes("[異體]"));
        assert.ok(result.slice(divider).includes("「機」的異體字。"));
        assert.ok(
            !render(characters.get("徸"), field).includes("<div>---</div>"),
        );
        assert.ok(
            !render(characters.get("峯"), field).includes("<div>---</div>"),
        );
    }
});

test("有音讀音組只有異體說明時省略異體標題", () => {
    for (const field of ["bopomofo", "pinyin"]) {
        assert.ok(!render(characters.get("徸"), field).includes("[異體]"));
        assert.ok(!render(characters.get("韛"), field).includes("[異體]"));
        assert.ok(render(characters.get("圲"), field).includes("[異體]"));
    }
});
test("同字展開依原始欄位判斷，空 def 的 link 提升為正文", () => {
    assert.ok(html("三").includes("北方方言。指三個"));
    assert.ok(!html("三").includes("﹝仨﹞"));
    assert.ok(!html("偺").includes("參見「咱家」條。"));
    assert.ok(!html("予").includes("﹝余﹞"));
    const tuo = html("佗");
    assert.ok(tuo.includes("同「它」。") && tuo.includes("何為淹留寄佗方"));
    assert.ok(!tuo.includes("(一)之又音。"));
    assert.ok(!tuo.includes("第三人稱代名詞"));
});
test("參見多音按語境篩選，單音聲調不同仍展開", () => {
    const result = html("行");
    assert.ok(result.includes("﹝行行﹞"));
    assert.ok(
        result.includes("ㄏㄤˋ ㄏㄤˋ") && !result.includes("ㄏㄤˊ ㄏㄤˊ"),
    );
    assert.ok(html("叭").includes("﹝喇叭﹞"));
    assert.ok(html("個").includes("﹝個兒﹞"));
});
test("補充字級、深縮排、灰色，標題後首音不加空行", () => {
    const result = html("子");
    assert.ok(result.includes("font-size:0.9em;margin:0.3em 0 0.3em 2em;"));
    assert.ok(
        result.includes(
            "font-size:0.85em;margin:0.3em 0 0.3em 2em;color:#555555;",
        ),
    );
    assert.ok(
        html("发").includes('【發】</div><div style="font-weight:normal;'),
    );
    assert.ok(html("行").includes('<br><div style="font-weight:normal;'));
});
test("多個 link 同目標保留標題並去重；不修改原始資料", () => {
    const entries = [
        {
            title: "甲",
            heteronyms: [
                {
                    bopomofo: "ㄐㄧㄚˇ",
                    definitions: [
                        { def: "", link: ["同「乙」、「丙」。", "同「乙」。"] },
                    ],
                },
            ],
        },
        ...["乙", "丙"].map((title) => ({
            title,
            heteronyms: [
                {
                    bopomofo: "ㄐㄧㄚˇ",
                    definitions: [{ def: title + "的解釋。" }],
                },
            ],
        })),
    ];
    const before = JSON.stringify(entries);
    const source = { primary: organizeEntries(entries), auxiliary: null };
    const result = createRenderer(createLookup(source))(
        selectCharacters(source)[0],
    );
    assert.equal(result.split("﹝乙﹞").length - 1, 1);
    assert.ok(result.includes("﹝丙﹞"));
    assert.equal(JSON.stringify(entries), before);
});

test("輔助來源依顯示順序編號，借音沿用編號；多正字加字頭", () => {
    const source = {
        primary: organizeEntries([
            {
                title: "甲",
                heteronyms: [
                    {
                        definitions: [
                            { def: "「乙」的異體字。" },
                            { def: "「丙」的異體字。" },
                        ],
                    },
                ],
            },
        ]),
        auxiliary: organizeEntries([
            {
                title: "乙",
                heteronyms: [
                    {
                        bopomofo: "音一",
                        pinyin: "one",
                        definitions: [{ def: "第一義。" }],
                    },
                    {
                        bopomofo: "音二",
                        pinyin: "two",
                        definitions: [{ def: "第二義。" }],
                    },
                ],
            },
            {
                title: "丙",
                heteronyms: [
                    {
                        bopomofo: "音一",
                        pinyin: "one",
                        definitions: [{ def: "另一字義。" }],
                    },
                ],
            },
        ]),
    };
    const characters = new Map(
        selectCharacters(source).map((item) => [item.title, item]),
    );
    const renderer = createRenderer(createLookup(source));
    for (const [field, first, second] of [
        ["bopomofo", "音一", "音二"],
        ["pinyin", "one", "two"],
    ]) {
        const borrowed = renderer(characters.get("甲"), field);
        assert.ok(
            borrowed.includes(
                `乙&nbsp;㈠ ${first}&nbsp;/&nbsp;乙&nbsp;㈡ ${second}&nbsp;/&nbsp;丙&nbsp;㈠ ${first}`,
            ),
        );
        const own = renderer(characters.get("乙"), field);
        assert.ok(own.includes(`㈠ ${first}`) && own.includes(`㈡ ${second}`));
    }
    const actual = html("徸");
    assert.ok(
        actual.includes("㈠ ㄔㄨㄥˋ") &&
            actual.includes("㈡ ㄓㄨㄥˇ") &&
            actual.includes("㈢ ㄉㄨㄥˋ"),
    );
});

test("參見展開省略讀音編號，但主字與異體字借音維持編號", () => {
    const result = html("個");
    assert.ok(
        result.includes(
            '﹝個子﹞</span> <span style="font-weight:normal;">ㄍㄜˋ ˙ㄗ</span>',
        ),
    );
    assert.ok(
        !result.includes(
            '﹝個子﹞</span> <span style="font-weight:normal;">㈠',
        ),
    );
    const entries = [
        {
            title: "甲",
            heteronyms: [
                { bopomofo: "音甲", definitions: [{ def: "參見「行」。" }] },
            ],
        },
    ];
    const source = {
        primary: organizeEntries([
            ...entries,
            ...data.primary.byTitle.get("行"),
        ]),
        auxiliary: null,
    };
    const content = createRenderer(createLookup(source))(
        selectCharacters(source)[0],
    );
    assert.ok(content.includes("﹝行﹞"));
    assert.ok(!/[㈠-㈩]/u.test(content));
    assert.ok(html("行").includes("㈠ ㄒㄧㄥˊ"));
    assert.ok(html("㕘").includes("㈠ ㄘㄢ"));
    assert.ok(html("三").includes("㈠ ㄙㄚ"));
});

test("有音異體字只展開匹配讀音，兩個讀音指向同字時各自展開", () => {
    const source = {
        primary: organizeEntries([
            {
                title: "甲",
                heteronyms: [
                    {
                        bopomofo: "ㄐㄧㄚˇ",
                        pinyin: "jiǎ",
                        definitions: [{ def: "「乙」的異體字。" }],
                    },
                    {
                        bopomofo: "ㄧˇ",
                        pinyin: "yǐ",
                        definitions: [{ def: "「乙」的異體字。" }],
                    },
                ],
            },
            {
                title: "乙",
                heteronyms: [
                    {
                        bopomofo: "ㄐㄧㄚˇ",
                        pinyin: "jiǎ",
                        definitions: [{ def: "甲音專屬解釋。" }],
                    },
                    {
                        bopomofo: "ㄧˇ",
                        pinyin: "yǐ",
                        definitions: [{ def: "乙音專屬解釋。" }],
                    },
                ],
            },
        ]),
        auxiliary: null,
    };
    const render = createRenderer(createLookup(source));
    const character = selectCharacters(source)[0];
    for (const field of ["bopomofo", "pinyin"]) {
        const result = render(character, field);
        const parts = result.split('color:#555555;">');
        assert.equal(parts.length, 3);
        assert.ok(!parts[1].includes(field === "bopomofo" ? "ㄐㄧㄚˇ" : "jiǎ"));
        assert.ok(!parts[2].includes(field === "bopomofo" ? "ㄧˇ" : "yǐ"));
        assert.ok(
            parts[1].includes("甲音專屬解釋。") &&
                !parts[1].includes("乙音專屬解釋。"),
        );
        assert.ok(
            parts[2].includes("乙音專屬解釋。") &&
                !parts[2].includes("甲音專屬解釋。"),
        );
    }
});

test("有音異體字無匹配時不展開，無音借音仍保留各組讀音", () => {
    for (const field of ["bopomofo", "pinyin"]) {
        const different = render(characters.get("韛"), field);
        const borrowed = render(characters.get("㕘"), field);
        assert.ok(different.includes("「鞴」的異體字。"));
        const unmatched = different.slice(
            0,
            different.indexOf("「箙」的異體字。"),
        );
        assert.ok(!unmatched.includes('color:#555555;">'));
        assert.ok(!different.includes("車絥"));
        assert.ok(
            borrowed
                .split('color:#555555;">')[1]
                .includes(field === "bopomofo" ? "ㄘㄢ" : "cān"),
        );
    }
});
test("輔助來源先實義後異體編號，借音也沿用最終編號", () => {
    const source = {
        primary: organizeEntries([
            {
                title: "甲",
                heteronyms: [{ definitions: [{ def: "「乙」的異體字。" }] }],
            },
        ]),
        auxiliary: organizeEntries([
            {
                title: "乙",
                heteronyms: [
                    {
                        bopomofo: "ㄧˇ",
                        pinyin: "yǐ",
                        definitions: [{ def: "「丙」的異體字。" }],
                    },
                    {
                        bopomofo: "ㄐㄧㄚˇ",
                        pinyin: "jiǎ",
                        definitions: [{ def: "一般實義。" }],
                    },
                ],
            },
        ]),
    };
    const render = createRenderer(createLookup(source));
    const characters = new Map(
        selectCharacters(source).map((item) => [item.title, item]),
    );
    assert.ok(render(characters.get("乙")).includes("㈠ ㄐㄧㄚˇ"));
    assert.ok(render(characters.get("乙")).includes("㈡ ㄧˇ"));
    assert.ok(
        render(characters.get("甲")).includes("㈠ ㄐㄧㄚˇ&nbsp;/&nbsp;㈡ ㄧˇ"),
    );
});
