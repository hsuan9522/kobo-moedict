const normalize = (value) => (value || "").replace(/\s+/gu, "").trim();
function sourceReadingNumber(title, pronunciation, orders) {
    const matches = (orders[title] || []).filter(
        (item) =>
            normalize(item.bopomofo) === normalize(pronunciation.bopomofo) &&
            (!item.pinyin ||
                !pronunciation.pinyin ||
                normalize(item.pinyin) === normalize(pronunciation.pinyin)),
    );
    const values = [...new Set(matches.map((item) => item.order))];
    return values.length === 1 ? values[0] : null;
}
function readingNumberLabel(number) {
    return number >= 1 && number <= 10
        ? String.fromCodePoint(0x3220 + number - 1)
        : number
          ? `（${number}）`
          : "";
}

const isVariantDefinition = (definition) =>
    /^「[^」]+」的異體字。?$/u.test((definition.def || "").trim());

// 各字分組內先列一般釋義，再列異體字說明；拆分時保留原讀音及來源字頭。
function orderVariantDefinitions(entries) {
    const regular = [],
        variants = [],
        unvoicedVariants = [];
    for (const entry of entries) {
        for (const pronunciation of entry.heteronyms || []) {
            const definitions = pronunciation.definitions || [];
            for (const [destination, selected] of [
                [
                    regular,
                    definitions.filter(
                        (definition) => !isVariantDefinition(definition),
                    ),
                ],
                [
                    pronunciation.bopomofo || pronunciation.pinyin
                        ? variants
                        : unvoicedVariants,
                    definitions.filter(isVariantDefinition),
                ],
            ]) {
                if (selected.length)
                    destination.push({
                        ...entry,
                        heteronyms: [
                            { ...pronunciation, definitions: selected },
                        ],
                    });
            }
        }
    }
    return regular.concat(variants, unvoicedVariants);
}

function variantTargets(pronunciation) {
    if (
        (pronunciation.bopomofo || "").trim() ||
        (pronunciation.pinyin || "").trim()
    )
        return [];
    const definitions = pronunciation.definitions || [];
    if (!definitions.length) return [];
    const matches = definitions.map((definition) =>
        (definition.text || definition.def || "")
            .trim()
            .match(/^「([^」]+)」的異體字。?$/u),
    );
    return matches.every(Boolean) ? matches.map((match) => match[1]) : [];
}

function supplementReadings(
    entry,
    lookup,
    { getReadingNumber = () => null } = {},
) {
    function collect(target, visited, readings, detailed) {
        if (visited.has(target)) return;
        const nextVisited = new Set([...visited, target]);
        for (const group of lookup(target)) {
            for (const item of group.entries) {
                const pronunciations = [...(item.heteronyms || [])].sort(
                    (a, b) =>
                        (getReadingNumber(group.title, a) || 999) -
                        (getReadingNumber(group.title, b) || 999),
                );
                for (const pronunciation of pronunciations) {
                    const record = {
                        title: group.title,
                        number: getReadingNumber(group.title, pronunciation),
                        bopomofo: (pronunciation.bopomofo || "").trim(),
                        pinyin: (pronunciation.pinyin || "").trim(),
                    };
                    if (record.bopomofo || record.pinyin)
                        detailed.set(JSON.stringify(record), record);
                    for (const field of ["bopomofo", "pinyin"]) {
                        const value = (pronunciation[field] || "").trim();
                        if (value) readings[field].add(value);
                    }
                    for (const next of variantTargets(pronunciation)) {
                        collect(next, nextVisited, readings, detailed);
                    }
                }
            }
        }
    }

    return {
        ...entry,
        heteronyms: entry.heteronyms.map((pronunciation) => {
            const targets = variantTargets(pronunciation);
            if (!targets.length) return pronunciation;
            const readings = { bopomofo: new Set(), pinyin: new Set() };
            const detailed = new Map();
            for (const target of targets)
                collect(target, new Set([entry.title]), readings, detailed);
            // 補音與原始讀音分開，避免影響無讀音異體字的分類及標題合併。
            return {
                ...pronunciation,
                borrowedReadings: {
                    bopomofo: [...readings.bopomofo].join("/"),
                    pinyin: [...readings.pinyin].join("/"),
                },
                borrowedReadingDetails: [...detailed.values()],
            };
        }),
    };
}

module.exports = {
    sourceReadingNumber,
    readingNumberLabel,
    isVariantDefinition,
    orderVariantDefinitions,
    supplementReadings,
};
