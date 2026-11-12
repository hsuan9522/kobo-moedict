const fs = require("node:fs");
const path = require("node:path");
const { projectRoot, versions } = require("../format/config");
const { loadSources } = require("../format/data");
const { selectCharacters } = require("../format/data");
const { createLookup } = require("../format/data");
const { createRenderer } = require("../format/render");
const { spawnSync } = require("node:child_process");

const cases = require("../demo/cases.json");
const titles = cases.map((item) => item.title);
const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
const modes = new Map();
const rendered = new Map();
for (const version of versions) {
    if (!modes.has(version.mode)) {
        const data = loadSources(version.mode);
        modes.set(version.mode, {
            characters: new Map(
                selectCharacters(data).map((character) => [
                    character.title,
                    character,
                ]),
            ),
            render: createRenderer(createLookup(data)),
        });
    }
    const { characters, render } = modes.get(version.mode);
    rendered.set(
        version.id,
        new Map(
            titles.map((title) => {
                const character = characters.get(title);
                return [
                    title,
                    character
                        ? render(character, version.pronunciation)
                        : '<p class="missing">此版本未收錄</p>',
                ];
            }),
        ),
    );
}
const categories = [...new Set(cases.map((item) => item.category))];
const nav = categories
    .map(
        (category) =>
            `<div><strong>${escapeHtml(category)}</strong> ${cases
                .filter((item) => item.category === category)
                .map(
                    (item) =>
                        `<a href="#char-${item.title}" title="${escapeHtml(item.purpose)}">${item.title}</a>`,
                )
                .join(" ")}</div>`,
    )
    .join("\n");
const defaultVersion = "combined-bpmf";
const buttons = versions
    .map(
        (version) =>
            `<button type="button" data-version="${version.id}" aria-pressed="${version.id === defaultVersion}">${version.label}</button>`,
    )
    .join(" ");
const body = cases
    .map(
        ({ title, category, purpose }) =>
            `<section id="char-${title}"><p class="case-purpose">${escapeHtml(category)}｜${escapeHtml(purpose)}</p><h2>${title}</h2>${versions
                .map(
                    (version) =>
                        `<div data-panel="${version.id}"${version.id === defaultVersion ? "" : " hidden"}>${rendered.get(version.id).get(title)}</div>`,
                )
                .join("")}</section>`,
    )
    .join("\n");
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kobo 萌典：三版本正式排版預覽</title><style>body{margin:24px;background:#eee;color:#111;font:18px/1.65 system-ui,"Microsoft JhengHei",sans-serif}header,main{max-width:700px;margin:auto}nav{line-height:2.2}nav a{color:#222;margin-right:8px}section{padding:24px;background:white;margin:24px 0;scroll-margin-top:16px}h1{font-size:25px}h2{margin:0 0 .35em}p{font-size:14px;color:#555}.versions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.versions button{font:inherit;font-size:15px;padding:8px 12px;border:1px solid #aaa;border-radius:5px;background:white;cursor:pointer}.versions button[aria-pressed="true"]{background:#222;color:white;border-color:#222}[hidden]{display:none!important}.back-to-top{position:fixed;right:20px;bottom:20px;z-index:10;padding:10px 16px;border-radius:6px;background:#222;color:#fff;text-decoration:none;font-size:15px;box-shadow:0 2px 8px #0003}.back-to-top:focus-visible{outline:3px solid #888;outline-offset:3px}</style>
<header id="top"><h1>三版本正式排版預覽</h1><p>${titles.length} 個代表字例，依測試用途分組。保留原先的重要實機回歸字，移除用途重疊的案例，新增攵以檢查多個正字的借音編號。與正式建置共用同一渲染器。純繁體版只查教育部來源；繁簡版的主字頭下方﹝字﹞列出繁簡對應，一簡對多繁保留各字全部讀音和釋義。讀音的㈠㈡採教育部原始編號；借用讀音沿用正字編號，輔助來源依其讀音順序編號。瀏覽器與 Kobo 的換行、字型及間距仍可能不同。</p><div class="versions" aria-label="選擇字典版本">${buttons}</div><p id="current-version">目前：繁體＋簡體－注音</p><nav>${nav}</nav></header><main>${body}</main><a class="back-to-top" href="#top">回到最上面</a>
<script>
document.querySelectorAll('[data-version]').forEach(button => {
    button.addEventListener('click', () => {
        const version = button.dataset.version;
        document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== version; });
        document.querySelectorAll('[data-version]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        document.getElementById('current-version').textContent = '目前：' + button.textContent;
    });
});
</script></html>`;
const output = path.join(projectRoot, "demo", "index.html");
fs.mkdirSync(path.dirname(output), { recursive: true });
if (fs.existsSync(output) && !process.argv.includes("--reset-layout")) {
    const result = spawnSync(
        "python",
        [path.join(projectRoot, "scripts", "update_demo.py"), output],
        {
            input: JSON.stringify(
                Object.fromEntries(
                    [...rendered].map(([version, entries]) => [
                        version,
                        Object.fromEntries(entries),
                    ]),
                ),
            ),
            encoding: "utf8",
        },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(result.stderr || "Demo update failed");
    process.stdout.write(result.stdout);
} else {
    fs.writeFileSync(output, html);
    console.log(
        `${titles.length} entries × ${versions.length} versions: ${output}`,
    );
}
