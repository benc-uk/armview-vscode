const fail = require("assert").fail;
const ARMParser = require('../out/lib/arm-parser').default;
//import * as vscode from 'vscode';
const fs = require('fs');

/*
rm -rf azure-quickstart-templates-master
wget https://github.com/Azure/azure-quickstart-templates/archive/master.zip
unzip master.zip
rm master.zip
*/

console.log = () => null

const parser = new ARMParser('', 'main', null, null);

// Run ARMParser on given filename
async function testTemplate(filename) {
	const template = fs.readFileSync(filename);
  try {
    const result = await parser.parse(template.toString());    
    if(result)
      return
  } catch(err) {
    return err
  }
}

// Recursively search down directory tree
function walkSync(dir, filelist, filter) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + file).isDirectory()) {
      filelist = walkSync(dir + file + '/', filelist, filter);
    }
    else {
      if(dir.includes('php-pgsql-freebsd-setup')) //if(!dir.includes('301'))
        return;

      if(file.includes(filter))
        filelist.push(dir + file);
    }
  });
  return filelist;
};

// Find azuredeploy.json files
let files = []
files = walkSync('./test/azure-quickstart-templates-master/', files, 'azuredeploy.json')

files.forEach(function(file) {
  describe('Test: ' + file, function() {
    it('Parse file', async function() {
      const err = await testTemplate(file);
      if(err)
        fail(err);
    })
  });
});

