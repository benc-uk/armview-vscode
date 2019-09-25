import { fail } from "assert";
import ARMParser from '../src/lib/arm-parser';
const fs = require('fs');

console.log = function(s) {

}

// Run ARMParser on given filename
function testTemplate(filename) {
	let template = fs.readFileSync(filename)
	let parser = new ARMParser(template.toString(), '');
	if(parser.getError()) {
    return parser.getError()
	} else {
    return null;
    // totalOk++
  }
}

// Recursively search down directory tree
function walkSync(dir, filelist, filter) {
  var fs = fs || require('fs'),
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + file).isDirectory()) {
      filelist = walkSync(dir + file + '/', filelist, filter);
    }
    else {
      if(dir.includes('php-pgsql-freebsd-setup'))
        return;

      if(file.includes(filter))
        filelist.push(dir + file);
    }
  });
  return filelist;
};

// Find azuredeploy.json files
let files = []
files = walkSync('/home/ben/temp/azure-quickstart-templates-master/', files, 'azuredeploy.json')

files.forEach(function(file) {
  describe('Test: ' + file, function() {
    it('Parse file', function(done) {
      let err = testTemplate(file);
      if(err)
        fail(err);
      
      done();
    })
  });
});

