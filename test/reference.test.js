const fail = require("assert").fail;
const ARMParser = require('../out/lib/arm-parser').default;
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

console.log = function (s) { }

var parser = new ARMParser('', 'main', null, null);

// Run ARMParser on given filename
async function loadTemplate(filename, parameterFilename) {
  let template = fs.readFileSync(filename);
  let parameters = parameterFilename && fs.readFileSync(parameterFilename);
  try {
    return await parser.parse(template.toString(), parameters && parameters.toString());
  } catch (err) {
    return err;
  }
}

//
//
//
describe('Test: basic.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/basic.json");
  });
  it('Validate nodes & edges', async function () {
    expect(res).to.have.lengthOf(8);
    let edgeCount = 0;
    for (let node of res) {
      if (node.group == 'nodes') continue;
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
describe('Test: vars-params.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/vars-params.json");
  });

  it('Validate node count', async function () {
    expect(res).to.have.lengthOf(8);
  });

  it('Validate var & param substitution 1', async function () {
    expect(res[0].data.name).to.be.eq("A%20simple%20var_A%20simple%20name");
  })
  it('Validate var & param substitution 2', async function () {
    expect(res[1].data.name).to.be.eq("Cheese_A%20simple%20var");
  })
  it('Validate var & param substitution 3', async function () {
    expect(res[2].data.name).to.be.eq("Lou%20Reed");
  })
  it('Validate var & param substitution 4', async function () {
    expect(res[3].data.name).to.be.eq("Zappa");
  })
  it('Validate var & param substitution 5', async function () {
    expect(res[4].data.name).to.be.eq("Waters");
  })
  it('Validate var & param substitution 6', async function () {
    expect(res[5].data.name).to.be.eq("Bowie");
  })
  it('Validate var & param substitution 7', async function () {
    expect(res[6].data.name).to.be.eq("Osbourne");
  })
  it('Validate var & param substitution 8', async function () {
    expect(res[7].data.name).to.be.eq("Iommi");
  })
});

//
//
//
describe('Test: linked.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/linked.json");
  });

  it('Validate node count', async function () {
    expect(res).to.have.lengthOf(8);
  });

  it('Validate linked template', async function () {
    // !NOTE! Without a VS Code instance/workspace we can't fully test linked template resolution
    expect(res).to.be.an("array").to.containSubset([{ data: { name: "aks101cluster" } }]);
  })
});

//
//
//
describe('Test: expressions.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/expressions.json");
  });

  it('Validate node count', async function () {
    expect(res).to.have.lengthOf(6);
  });

  it('Validate expression evaluation 1', async function () {
    expect(res[0].data.name).to.be.eq("zone-foo_web5");
  })
  it('Validate expression evaluation 2', async function () {
    expect(res[1].data.name).to.be.eq("http%3A%2F%2Fexample.com%2Fben.js");
  })
  it('Validate expression evaluation 3', async function () {
    expect(res[2].data.name).to.be.eq("that%20at%20ok%20ZIS");
  })
  it('Validate expression evaluation 4', async function () {
    expect(res[3].data.name).to.be.eq("TWO");
  })
  it('Validate expression evaluation 5', async function () {
    expect(res[4].data.name).to.be.eq("977d95b7-70c9-5b8a-9a61-ebc22fb8167f");
  })
  it('Validate expression evaluation 6', async function () {
    expect(res[5].data.name).to.be.eq("LTM4NjUwNDUwNw");
  })
});

//
//
//
describe('Test: waterfall.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/waterfall-template.json", "test/ref/waterfall-params.json");
  });

  it('Validate node count', async function () {
    expect(res).to.have.lengthOf(8);
  });
});

//
//
//
describe('Test: child-chain-template.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/child-chain-template1.json");
  });

  it('Validate node count', async function () {
    expect(res).to.have.lengthOf(5);
  });
});

//
//
//
describe('Test: union.json', function () {
  let res;
  it('Parse file', async function () {
    res = await loadTemplate("test/ref/union.json");
  });

  it('Validate name', async function () {
    expect(res[0].data.name).to.eq('String1String2')
  });
});
