const {
    selectReferenceGroups,
    planDefinitionReferences,
} = require("./references");
const {
    isVariantDefinition,
    orderVariantDefinitions,
    supplementReadings,
    sourceReadingNumber,
    readingNumberLabel,
} = require("./readings");
const { normalizeEntry } = require("./data");
const readingOrders = require("../data/reading-orders.json");

const escape = (x) =>
    String(x || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
const text = (x) =>
    escape(x)
        .replace(/&lt;br\s*\/?&gt;/gi, " / ")
        .replace(/陸⃝/g, "〔陸〕")
        .replace(/臺⃝/g, "〔臺〕");
const readingText = (x) => text(x).replace(/\s*\/\s*/g, "&nbsp;/&nbsp;");

function createContentRenderer(rawLookup) {
    const numberedGroups = new WeakMap();
    function annotate(group) {
        if (group.source !== "auxiliary") return group;
        let entries = numberedGroups.get(group.entries);
        if (!entries) {
            const pronunciations = group.entries.flatMap(
                (entry) => entry.heteronyms || [],
            );
            const isVariantOnly = (h) =>
                h.definitions?.length &&
                h.definitions.every(isVariantDefinition);
            const displayOrder = new Map(
                [
                    ...pronunciations.filter((h) => !isVariantOnly(h)),
                    ...pronunciations.filter(isVariantOnly),
                ].map((h, index) => [h, index + 1]),
            );
            entries = group.entries.map((entry) => ({
                ...entry,
                heteronyms: (entry.heteronyms || []).map((h) => ({
                    ...h,
                    displayReadingNumber: displayOrder.get(h),
                })),
            }));
            numberedGroups.set(group.entries, entries);
        }
        return { ...group, entries };
    }
    const lookup = (target) => rawLookup(target).map(annotate);
    const readingNumber = (title, h) =>
        h.displayReadingNumber ?? sourceReadingNumber(title, h, readingOrders);
    return function (character, field) {
        const c = { ...character, groups: character.groups.map(annotate) },
            title = c.title;
        const groupTitles = new Set(c.groups.map((g) => g.title));
        function renderReference(
            group,
            seen,
            showTitle = true,
            showNumbers = true,
            hideReading = false,
        ) {
            if (!showTitle)
                return (
                    '<section class="reference">' +
                    renderEntries(
                        group.entries,
                        1,
                        seen,
                        hideReading,
                        showNumbers,
                    ) +
                    "</section>"
                );
            const pronunciations = group.entries.flatMap(
                (entry) => entry.heteronyms || [],
            );
            const inline =
                pronunciations.length === 1 ? pronunciations[0][field] : "";
            const inlineNumber =
                showNumbers && pronunciations.length === 1
                    ? readingNumberLabel(
                          readingNumber(group.title, pronunciations[0]),
                      )
                    : "";
            return (
                '<section class="reference"><div class="reference-title"><span style="font-weight:bold;">﹝' +
                escape(group.title) +
                "﹞</span>" +
                (inline
                    ? ' <span style="font-weight:normal;">' +
                      (inlineNumber ? inlineNumber + " " : "") +
                      readingText(inline) +
                      "</span>"
                    : "") +
                "</div>" +
                renderEntries(group.entries, 1, seen, !!inline, showNumbers) +
                "</section>"
            );
        }
        function renderEntries(
            entries,
            depth = 0,
            seen = new Set(),
            hideReading = false,
            showNumbers = true,
        ) {
            let out = "";
            let variantHeading = false,
                unvoicedHeading = false,
                variantNumber = 0,
                lastReading = null,
                hasContent = false;
            const allPronunciations = entries.flatMap(
                (entry) => entry.heteronyms || [],
            );
            const unvoicedVariant =
                allPronunciations.length > 0 &&
                allPronunciations.every(
                    (h) =>
                        !(h.bopomofo || "").trim() &&
                        !(h.pinyin || "").trim() &&
                        h.definitions?.length &&
                        h.definitions.every(isVariantDefinition),
                );
            if (unvoicedVariant && !hideReading) {
                const details = entries
                    .flatMap((entry) =>
                        supplementReadings(normalizeEntry(entry), lookup, {
                            getReadingNumber: readingNumber,
                        }).heteronyms.flatMap(
                            (h) => h.borrowedReadingDetails || [],
                        ),
                    )
                    .filter((item) => item[field]);
                const multipleTitles =
                    new Set(details.map((item) => item.title)).size > 1;
                const readings = [
                    ...new Set(
                        details.map(
                            (item) =>
                                (multipleTitles
                                    ? escape(item.title) +
                                      (showNumbers && item.number
                                          ? "&nbsp;"
                                          : "")
                                    : "") +
                                (showNumbers
                                    ? readingNumberLabel(item.number)
                                    : "") +
                                (multipleTitles || (showNumbers && item.number)
                                    ? " "
                                    : "") +
                                readingText(item[field]),
                        ),
                    ),
                ];
                if (readings.length) {
                    out +=
                        '<div class="reading">' +
                        readings.join("&nbsp;/&nbsp;") +
                        "</div>";
                    hasContent = true;
                }
            }
            const prepared = entries.map((entry) => ({
                ...entry,
                heteronyms: (entry.heteronyms || []).map((h) => ({
                    ...h,
                    definitions: (h.definitions || [])
                        .filter(
                            (d) =>
                                (d.def || "").trim() ||
                                ["link", "example", "quote"].some((key) =>
                                    (d[key] || []).some((value) =>
                                        value.trim(),
                                    ),
                                ),
                        )
                        .map((d) => {
                            let result = {
                                ...d,
                                referencePlan: planDefinitionReferences(d),
                            };
                            if (!(d.def || "").trim() && d.link?.length)
                                result = {
                                    ...result,
                                    def: d.link.join(""),
                                    link: [],
                                };
                            result.def = result.def || "";
                            return result;
                        }),
                })),
            }));
            const numbered = prepared.map((entry) => ({
                ...entry,
                heteronyms: entry.heteronyms
                    .map((h) => ({
                        ...h,
                        hasRegularDefinitions: h.definitions.some(
                            (d) => !isVariantDefinition(d),
                        ),
                    }))
                    .sort(
                        (a, b) =>
                            (readingNumber(entry.title, a) || 999) -
                            (readingNumber(entry.title, b) || 999),
                    ),
            }));
            for (const entry of orderVariantDefinitions(numbered))
                for (const h of entry.heteronyms || []) {
                    const defs = h.definitions || [];
                    const pure = defs.length && defs.every(isVariantDefinition);
                    if (h[field] && !hideReading && h[field] !== lastReading) {
                        const number = showNumbers
                            ? readingNumberLabel(readingNumber(entry.title, h))
                            : "";
                        out +=
                            (hasContent ? "<br>" : "") +
                            '<div class="reading">' +
                            (number ? number + " " : "") +
                            readingText(h[field]) +
                            "</div>";
                        lastReading = h[field];
                    }
                    hasContent = true;
                    if (pure && depth === 0) {
                        const noReading = !(h.bopomofo || h.pinyin);
                        if (noReading && !unvoicedVariant && !unvoicedHeading) {
                            out += '<div>---</div><div class="part">異體</div>';
                            unvoicedHeading = true;
                        } else if (
                            !noReading &&
                            h.hasRegularDefinitions &&
                            !variantHeading &&
                            !unvoicedVariant
                        ) {
                            out += '<div class="part">異體</div>';
                            variantHeading = true;
                        }
                        for (const d of defs) {
                            out +=
                                '<div class="definition"><span class="number">·</span><div>' +
                                text(d.def);
                            const target = d.def.match(/^「([^」]+)」/)[1];
                            const voiced = !!(h.bopomofo || h.pinyin);
                            const targetKey = voiced
                                ? JSON.stringify([target, h.bopomofo, h.pinyin])
                                : target;
                            if (!seen.has(target) && !seen.has(targetKey)) {
                                seen.add(targetKey);
                                if (groupTitles.has(target))
                                    out +=
                                        '<p class="hint">「' +
                                        escape(target) +
                                        "」的解釋見本頁對應分組。</p>";
                                else {
                                    const groups = lookup(target);
                                    const matched = voiced
                                        ? selectReferenceGroups(groups, {
                                              sourceTitle: entry.title,
                                              pronunciation: h,
                                              target,
                                              text: d.def,
                                              requireMatch: true,
                                          })
                                        : groups;
                                    for (const g of matched) {
                                        const sameReading =
                                            !!h[field] &&
                                            g.entries.every((entry) =>
                                                (entry.heteronyms || []).every(
                                                    (item) =>
                                                        !!item[field] &&
                                                        readingText(
                                                            item[field],
                                                        ) ===
                                                            readingText(
                                                                h[field],
                                                            ),
                                                ),
                                            );
                                        out += renderReference(
                                            g,
                                            seen,
                                            false,
                                            true,
                                            sameReading,
                                        );
                                    }
                                }
                            }
                            out += "</div></div>";
                        }
                        continue;
                    }
                    let type = null,
                        number = 0;
                    for (const d of defs) {
                        const variant = isVariantDefinition(d);
                        const displayType = variant
                            ? unvoicedVariant || !h.hasRegularDefinitions
                                ? ""
                                : "異體"
                            : d.type || "";
                        if (displayType !== type) {
                            type = displayType;
                            number = 0;
                            if (type)
                                out +=
                                    '<div class="part">' +
                                    escape(type) +
                                    "</div>";
                        }
                        if (!variant) number++;
                        out +=
                            '<div class="definition"><span class="number">' +
                            "·" +
                            "</span><div>" +
                            text(d.def);
                        if (d.example?.length)
                            out +=
                                '<div class="example">' +
                                d.example.map(text).join("<br>") +
                                "</div>";
                        if (d.quote?.length)
                            out +=
                                '<div class="quote">' +
                                d.quote.map(text).join("<br>") +
                                "</div>";
                        if (d.link?.length)
                            out +=
                                '<div class="link">' +
                                d.link.map(text).join("<br>") +
                                "</div>";
                        if (depth === 0) {
                            for (const ref of d.referencePlan || []) {
                                const matched = selectReferenceGroups(
                                    lookup(ref.target),
                                    {
                                        sourceTitle: entry.title,
                                        pronunciation: h,
                                        target: ref.target,
                                        text: ref.text,
                                    },
                                );
                                const showTitle =
                                    ref.forceTitle ||
                                    !(
                                        ref.kind === "同" &&
                                        [...ref.target].length === 1 &&
                                        matched.length === 1 &&
                                        matched[0].title === ref.target
                                    );
                                for (const g of matched)
                                    out += renderReference(
                                        g,
                                        new Set([title]),
                                        showTitle,
                                        ref.kind !== "參見",
                                    );
                            }
                        }
                        out += "</div></div>";
                    }
                }
            return out;
        }
        let html = "";
        if (c.groups.length === 1 && c.groups[0].title !== title)
            html +=
                '<div class="overview">﹝' +
                escape(c.groups[0].title) +
                "﹞</div>";
        if (c.groups.length > 1)
            html +=
                '<div class="overview">' +
                c.groups.map((g) => "﹝" + escape(g.title) + "﹞").join("") +
                "</div>";
        for (const g of c.groups) {
            html += '<section class="group">';
            if (c.groups.length > 1)
                html += "<h3>【" + escape(g.title) + "】</h3>";
            if (c.groups.length > 1 && g.title !== title)
                html +=
                    '<div class="hint">「' +
                    escape(title) +
                    "」亦對應「" +
                    escape(g.title) +
                    "」。</div>";
            html +=
                renderEntries(g.entries, 0, new Set([g.title])) + "</section>";
        }

        return html;
    };
}

const styles = {
    overview: "margin-bottom:0.8em;",
    group: "margin-bottom:1em;",
    reading: "font-weight:normal;margin:0 0 0.5em;",
    part: "font-size:0.85em;margin-top:0.7em;",
    definition: "margin:0.5em 0;",
    example: "font-size:0.9em;margin:0.3em 0 0.3em 2em;",
    quote: "font-size:0.85em;margin:0.3em 0 0.3em 2em;color:#555555;",
    link: "font-size:0.85em;margin:0.3em 0 0.3em 2em;color:#555555;",
    "reference-title": "font-weight:bold;margin-bottom:0.4em;",
};

// Kobo uses inline styles and simple blocks; no Grid, tables or CSS borders.
function deviceHtml(html) {
    html = html
        .replace(/<p class="hint">[\s\S]*?<\/p>/g, "")
        .replace(/<div class="hint">[\s\S]*?<\/div>/g, "")
        .replace(
            /<span class="number">·<\/span><div>/g,
            "<div><span>·</span>&nbsp;",
        )
        .replace(
            /<div class="part">([^<]+)<\/div>/g,
            '<div class="part">[$1]</div>',
        );
    let group = 0;
    html = html.replace(
        /<section class="group">/g,
        () => (group++ ? "<div>-----</div>" : "") + '<section class="group">',
    );
    html = html.replace(/<section class="reference">/g, (match, offset) => {
        const showTitle = html
            .slice(offset + match.length)
            .startsWith('<div class="reference-title">');
        return `<div style="font-size:0.85em;margin:0.8em 0 0.8em ${showTitle ? "1em" : "2em"};color:#555555;">`;
    });
    // All section closing tags are now ordinary divs.
    html = html
        .replace(/<(div|span|section) class="([^"]+)">/g, (_, tag, name) => {
            if (!Object.hasOwn(styles, name))
                throw Error(`未知排版類別：${name}`);
            return `<${tag === "section" ? "div" : tag} style="${styles[name]}">`;
        })
        .replace(/<\/section>/g, "</div>");
    return html
        .replace(/<h3>/g, '<div style="font-weight:bold;margin:0.7em 0;">')
        .replace(/<\/h3>/g, "</div>");
}

function createRenderer(lookup) {
    const render = createContentRenderer(lookup);
    return (character, field = "bopomofo") => {
        if (!["bopomofo", "pinyin"].includes(field))
            throw Error(`不支援的讀音欄位：${field}`);
        return deviceHtml(render(character, field));
    };
}

module.exports = { createRenderer, deviceHtml };
