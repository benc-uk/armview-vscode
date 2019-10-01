const jsc = require('jsonc-parser');
const fs = require('fs');

let template = fs.readFileSync('./test/ref/jsontest.json', {encoding: 'utf8'});


let regex = /(".*?")/gims
let matches = template.match(regex)
if(matches) {
  for(match of matches) {
    let bad = match.includes('\n')
    if(bad) console.log("M="+match);
  }
}





let scanner = jsc.createScanner(template, true);

// var kind;
// while ((kind = scanner.scan()) !== 17) {
//   if(scanner.getTokenError()) {
//     console.log(scanner.getTokenOffset(), scanner.getTokenError(), scanner.getTokenValue());
//   }
// }

let err =[]
let res = jsc.parse(template, err)

//console.log(template);

for(let i = 0; i < err.length; i++) {
  let e = err[i];
  if(e.error == 12) {
    //console.log(e.error, e.length, template.charAt(e.offset), template.substr(e.offset, e.length))

    // let start = e.offset
    // let ni = i+1;
    // for(ni; ni < err.length; ni++) {
    //   let ne = err[ni];
    //   if(ne.error == 12) {
    //     console.log("ERRR! "+ni);
    //     i = ni;
    //     break;
    //   }
    // }
  }
  //console.log(e.error, e.length, template.charAt(e.offset), template.substr(e.offset, e.length))
}
