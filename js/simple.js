const fs = require('fs')

let simple = require('../all_simple_array.json')
const traditional = require('../all_tradition_array.json')

traditional_word = traditional.map(e=> e.word)

simple.forEach(el => {
    let word
    el.h.forEach(e => {
        if (e.hasOwnProperty('A')){
            word = e.A
        }
    })
    el.A = word ? word : el.t 
});

simple = simple.filter(e => !traditional_word.includes(e.A)) // simple_not_in_trad

const final = simple.map(e => {
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

fs.writeFile("./@simple.json", JSON.stringify(final), function (err) {
    if (err) throw err;
    console.log('complete');
}
);
