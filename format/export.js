const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { versions, sources, projectRoot } = require("./config");
const { loadSources } = require("./data");
const { selectCharacters } = require("./data");
const { createLookup } = require("./data");
const { createRenderer } = require("./render");

function createRows(data, pronunciation) {
    const lookup = createLookup(data);
    const renderCharacter = createRenderer(lookup);
    return selectCharacters(data)
        .map((character) => ({
            title: character.title,
            html: renderCharacter(character, pronunciation),
        }))
        .filter((row) => row.html.includes("<span>·</span>"));
}

function serializeCsv(rows) {
    const escape = (text) =>
        /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    // PyGlossary 的 CSV 讀取器會把一般標頭當作詞條，因此不加 char,def。
    return rows
        .map((row) => `${escape(row.title)},${escape(row.html)}\n`)
        .join("");
}

function writeDictionary(version) {
    const data = loadSources(version.mode);
    const rows = createRows(data, version.pronunciation);
    fs.mkdirSync(version.workDir, { recursive: true });
    const filename = path.join(version.workDir, "dictionary.csv");
    fs.writeFileSync(filename, serializeCsv(rows), "utf8");
    const summary = {
        version: version.id,
        pronunciation: version.pronunciation,
        entries: rows.length,
        csv: filename,
        status: "CSV complete; ZIP validation recorded separately",
        sources: Object.entries({
            primary: sources.primary,
            ...(version.mode === "combined"
                ? { auxiliary: sources.auxiliary }
                : {}),
            readingOrders: path.join(
                projectRoot,
                "data",
                "reading-orders.json",
            ),
        }).map(([name, filename]) => ({
            name,
            path: path.relative(projectRoot, filename),
            sha256: crypto
                .createHash("sha256")
                .update(fs.readFileSync(filename))
                .digest("hex"),
        })),
        counts: Object.fromEntries(
            Object.entries(data)
                .filter(([, dictionary]) => dictionary)
                .map(([name, dictionary]) => [
                    name,
                    {
                        titles: dictionary.byTitle.size,
                        singleCharacters: dictionary.singleCharacters.length,
                    },
                ]),
        ),
        ignoredAlternates: data.auxiliary
            ? data.auxiliary.singleCharacters.flatMap((entry) =>
                  (entry.heteronyms || [])
                      .filter((h) => h.alt && [...h.alt].length !== 1)
                      .map((h) => ({ title: entry.title, alt: h.alt })),
              )
            : [],
        pendingTitles: Object.entries(data).flatMap(([source, dictionary]) =>
            (dictionary?.glyphReport || [])
                .filter((item) => item.action === "略過字頭")
                .map((item) => ({ source, title: item.title })),
        ),
    };
    const glyphReport = Object.entries(data).flatMap(([source, dictionary]) =>
        (dictionary?.glyphReport || []).map((item) => ({ source, ...item })),
    );
    fs.writeFileSync(
        path.join(version.workDir, "glyphs-review.json"),
        JSON.stringify(glyphReport, null, 2),
        "utf8",
    );
    fs.writeFileSync(
        path.join(version.workDir, "summary.json"),
        JSON.stringify(summary, null, 2),
        "utf8",
    );
    return summary;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const selected =
        args.length === 0
            ? versions
            : versions.filter((version) => version.id === args[0]);
    if (args.length > 1 || selected.length === 0) {
        console.error(
            `用法：node format/export.js [${versions.map((v) => v.id).join("|")}]`,
        );
        process.exitCode = 1;
    } else {
        for (const version of selected) {
            const summary = writeDictionary(version);
            console.log(
                `${version.label}：${summary.entries} 筆，${summary.csv}`,
            );
        }
    }
}

module.exports = { createRows, serializeCsv, writeDictionary };
