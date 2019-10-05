const fail = require("assert").fail;
const ARMParser = require('../out/lib/arm-parser').default;
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

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

//
//
//
describe('Test: basic.json', function() {
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

//
//
//
describe('Test: vars-params.json', function() {
  let res;
  it('Parse file', async function() {
    res = await loadTemplate("test/ref/vars-params.json");
  });
  it('Validate nodes & edges', async function() {
    expect(res).to.have.lengthOf(8);

    expect(res).to.be.an("array").to.containSubset([{data:{name:"Lou%20Reed"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Waters"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Zappa"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Bowie"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Iommi"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Osbourne"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"Cheese_A%20simple%20var"}}]);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"A%20simple%20var_A%20simple%20name"}}]);
  })
});

//
//
//
describe('Test: linked.json', function() {
  let res;
  it('Parse file', async function() {
    res = await loadTemplate("test/ref/linked.json");
  });
  
  it('Validate nodes & edges', async function() {
    expect(res).to.have.lengthOf(8);
    expect(res).to.be.an("array").to.containSubset([{data:{name:"aks101cluster"}}]);

    // !NOTE! Without a VS Code instance/workspace we can't fully test linked template resolution
  })
});
