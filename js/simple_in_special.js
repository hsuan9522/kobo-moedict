const fs = require('fs')
const special = require('./special.json')
const simple = require('./simple_in_trad.json')

const special_array = special.map(e=>e.word)

const simple_in_special = simple.filter(e => special_array.includes(e.A))

const final = simple_in_special.map(e => {
    let bpmf, pinyin
    e.h.forEach(el => {
        bpmf = bpmf ? bpmf + `/${el.b}` : el.b
        pinyin = pinyin ? pinyin + `/${el.p}` : el.p
    });

    const def = e.h.map(el => {
        return el.d.map(ele => `<br>• ${ele.f}`)[0]
    })
    // console.log(def)
    const defString = `${def.join('')}<br>`.replace(/\"/g, "'")
    return {
        char: e.A,
        def: `﹝${e.t}﹞<font color='#f00'>${bpmf || pinyin}</font>${defString}`
    }
})


fs.writeFile("./test.json", JSON.stringify(final), function (err) {
    if (err) throw err;
    console.log('complete');
}
);