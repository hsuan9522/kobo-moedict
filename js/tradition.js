const fs = require('fs')
const simple = require('../simple_in_trad_word.json')
let tradition = require('../tradition_without_special.json')



tradition = tradition.sort((a,b)=> a.pron -b.pron).map(e => {
    const find = simple.filter(el => el.char == e.word)
    let t_word = ''
    if(find.length > 1) {
        find.forEach(el => {
            if(el.t_word) {
                t_word += `﹝${el.t_word}﹞`
            }
        });
    }

    return {
        ...e,
        t_word
    }
});

const res = tradition.map(e=> {
    if(e.pron > 1) {
        return {
            char: e.word,
            def: `<font color='#f00'>${e.bpmf}</font><br>${e.def}`,
        }
    } else {
        return {
            char: e.word,
            def: `${e.t_word}<font color='#f00'>${e.bpmf}</font><br>${e.def}`,
        }
    }
})



fs.writeFile("./test.json", JSON.stringify(res), function (err) {
    if (err) throw err;
    console.log('complete');
}
);