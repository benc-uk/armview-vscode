const fail = require("assert").fail;
const ARMParser = require('../out/lib/arm-parser').default; 
const fs = require('fs');
const expect = require('chai').expect;

console.log = function(s) {}

var parser = new ARMParser('', 'main', null, null);

// Run ARMParser on given filename
async function loadTemplate(filename) {
	let template = fs.readFileSync(filename);
  try {
    return await parser.parse(template.toString());    
  } catch(err) {
    return err;
  }
}

describe('Tests: basic.json', function() {
  let res;
  it('Parse file', async function() {
    res = await loadTemplate("test/ref/basic.json");
  });
  it('Validate nodes & edges', async function() {
    expect(res).to.have.lengthOf(8);
    let edgeCount = 0;
    for(let node of res) {
      if(node.group == 'nodes') continue;
      expect(node.data).to.have.nested.property('id');
      expect(node.data).to.have.nested.property('source');
      expect(node.data).to.have.nested.property('target');
      edgeCount++;
    }
    expect(edgeCount).to.equal(4)
  })
});

