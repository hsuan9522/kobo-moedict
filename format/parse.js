const fs = require('fs')
const all = require('./data/dict-revised.json')
const allSimple = require('./data/c.json')

// 教育部那份 json 檔案 format，刪除沒有其他意思，只是異體字的字
let { traditional, special } = all
    .filter(char => char.title.length === 1)
    .reduce(
        (result, char) => {
            const heteronyms = char.heteronyms || []
            const isSpecial =
                heteronyms.length === 1 &&
                Object.keys(heteronyms[0]).length === 1

            result[isSpecial ? 'special' : 'traditional'].push(char)
            return result
        },
        { traditional: [], special: [] }
    )

traditional = traditional.map(({ title, heteronyms }) => ({
    char: title,
    def: heteronyms.map(heteronym => ({
        bpmf: (heteronym.bopomofo || '').replace(/（.*?）/g, ''),
        pinyin: (heteronym.pinyin || '').replace(/（.*?）/g, ''),
        definitions: heteronym.definitions.map(def => ({
            def:
                def.def +
                (def.example || []).join('') +
                (def.quote || []).join('') +
                (def.link || []).join(''),
            type: def.type,
        })),
    })),
}))

traditional = traditional.map(char => {
    // 有其他意思，但同時也是異體字的讀音補齊
    return {
        char: char.char,
        def: char.def.map(el => {
            const word = el.definitions[0].def.match(/「(.*)」的異體字/)
            let bpmf = el.bpmf
            let pinyin = el.pinyin
            if (word) {
                const find =
                    traditional.find(el => el.char === word[1])?.def || []
                if (find.length) {
                    bpmf = find.map(el => el.bpmf).join('/')
                    pinyin = find.map(el => el.pinyin).join('/')
                }
            }
            return {
                ...el,
                bpmf,
                pinyin,
            }
        }),
    }
})

// 萌典 c.txt 簡體 format
const traditionalChars = new Set(traditional.map(item => item.char))

const simpleNotInTrand = allSimple
    .filter(char => char.t.length === 1)
    .reduce((result, char) => {
        const trad = char.t
        const simple = char.h[0].A

        if (!traditionalChars.has(trad)) {
            // 這個簡體不在繁體裡
            result.push({
                char: trad,
                def: char.h.map(heteronym => ({
                    bpmf: heteronym.b.replace(
                        /(.*)<br>陸⃝(.*)/g,
                        '$1（陸 $2）'
                    ),
                    pinyin: heteronym.p.replace(
                        /(.*)<br>陸⃝(.*)/g,
                        '$1（陸 $2）'
                    ),
                    definitions: heteronym.d.map(def => ({
                        def:
                            def.f +
                            (def.e || []).join('').replace(/例⃝/g, '如：'),
                    })),
                })),
            })
        } else {
            if (simple) {
                if (traditionalChars.has(simple)) {
                    traditional.forEach(el => {
                        // 這個簡體字有在繁體裡，把簡體補到繁體的更多
                        if (el.char === simple) {
                            el.more = el.more
                                ? el.more + `﹝${trad}﹞`
                                : `﹝${trad}﹞`
                        }
                    })
                } else {
                    // 這個簡體字沒有在繁體裡，但有對應的繁體字，把繁體解釋複製給簡體
                    const tmp = JSON.parse(
                        JSON.stringify(traditional.find(el => el.char === trad))
                    )
                    tmp.more = `﹝${trad}﹞`
                    tmp.char = simple
                    result.push(tmp)
                }
            } else {
                // 簡體字=繁體字，所以沒有 char.h.A
                traditional.forEach(el => {
                    if (el.char === trad) {
                        el.more = el.more
                            ? el.more + `﹝${trad}﹞`
                            : `﹝${trad}﹞`
                    }
                })
            }
        }
        return result
    }, [])

const simpleChars = new Set(simpleNotInTrand.map(item => item.char))

special = special
    .filter(e => !simpleChars.has(e.title))
    .map(({ title, heteronyms }) => ({
        char: title,
        def: heteronyms.map(heteronym => {
            const word = heteronym.definitions[0].def.match(/「(.*)」/)[1]
            const find = traditional.find(el => el.char === word)?.def || []
            return {
                bpmf: find.map(el => el.bpmf).join('/'),
                pinyin: find.map(el => el.pinyin).join('/'),
                definitions: heteronym.definitions.map(def => ({
                    def: def.def,
                    type: def.type,
                })),
            }
        }),
    }))

traditional.forEach(char => {
    if (char?.more && char.more.length === 3) {
        // 繁 = 簡，不應該有 more
        delete char.more
    }
})

const allWords = traditional.concat(special, simpleNotInTrand)

function getData(type /** bpmf || pinyin */) {
    return allWords
        .filter(e => e.char.length === 1)
        .map(char => {
            let def = char.more ? `${char.more}` : ''

            char.def.forEach(pron => {
                def += `<font color='#f00'>${pron[type]}</font><br>`
                let currType = ''
                pron.definitions.forEach((e, idx) => {
                    if (e.type && currType !== e.type) {
                        currType = e.type
                        def += `<br>[${e.type}]<br>`
                    }
                    def += `· ${e.def}<br>`

                    if (idx === pron.definitions.length - 1) {
                        def += `<br>`
                    }
                })
            })

            return {
                char: char.char,
                def,
            }
        })
}

function convertDictToCSV(dictFormat) {
    // 建立 CSV 標頭
    let csvContent = 'char,def\n'

    // 處理每個字條目
    dictFormat.forEach(entry => {
        // 處理 CSV 欄位中的特殊字符
        const char = escapeCsvField(entry.char)
        const def = escapeCsvField(entry.def)

        // 添加到 CSV 內容
        csvContent += `${char},${def}\n`
    })

    return csvContent
}

// 處理 CSV 欄位中的特殊字符
function escapeCsvField(field) {
    if (typeof field !== 'string') return field

    // 如果欄位包含逗號、引號或換行符，則需要用引號包裹
    if (
        field.includes(',') ||
        field.includes('"') ||
        field.includes('\n') ||
        field.includes('\r')
    ) {
        // 將引號替換為兩個引號（CSV 標準轉義方式）
        return `"${field.replace(/"/g, '""')}"`
    }

    return field
}

const dictFormat = getData(process.argv[2])

function save(type) {
    if (type === 'csv') {
        const csvContent = convertDictToCSV(dictFormat)

        // 使用 UTF-8 編碼寫入檔案
        fs.writeFile(
            './output/dictionary.csv',
            csvContent,
            { encoding: 'utf8' },
            err => {
                if (err) throw err
                console.log('成功')
            }
        )
    } else {
        fs.writeFile(
            './output/dictionary.json',
            JSON.stringify(dictFormat),
            function (err) {
                if (err) throw err
                console.log('complete')
            }
        )
    }
}

save('csv')
