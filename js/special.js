const fs = require('fs')

const simple = require('../special_simple.json')
const special = require('../special.json')
const tradition = require('../tradition_without_special.json')

const simple_array = simple.map(e=>e.char)

const filter = special.filter(e=> !simple_array.includes(e.word))

let res = filter.map(e => {
    return {
        ...e,
        t_word: e.def.match(/「(.)」的異體字。/) ? e.def.match(/「(.)」的異體字。/)[1] : '' 
    }
})

res.forEach(e => {
    const find = tradition.filter(el => el.word == e.t_word)
    let bpmf
    if(find.length) {
        find.forEach(el => {
            bpmf = bpmf ? bpmf + `/${el.bpmf}` : el.bpmf
        });
    } else {
        bpmf = ''
    }
    e.bpmf = bpmf
});

res = res.map(e=> {
    return {
        char: e.word,
        def: `﹝${e.t_word}﹞<font color='#f00'>${e.bpmf}</font><br>• 異體字`
    }
})



fs.writeFile("./test.json", JSON.stringify(res), function (err) {
    if (err) throw err;
    console.log('complete');
}
);