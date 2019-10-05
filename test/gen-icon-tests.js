const fs = require('fs')

function walkSync(dir, filelist) {
  var fs = fs || require('fs'),
      files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + file).isDirectory()) {
      filelist = walkSync(dir + file + '/', filelist);
    }
    else {
      filelist.push(dir+file);
    }
  });
  return filelist;
};

function saveTemplate(filename, res) {
  template = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "resources": res
  }

  out = JSON.stringify(template, null, 2);
  fs.writeFileSync(`icons/${filename}.json`, out);
}

const BASE_DIR = '../assets/img/azure/original/'
list = []
walkSync(BASE_DIR, list)
let resources = []

oldType = ""
for(let resType of list) {
  resType = resType.replace(BASE_DIR, '');
  resType = resType.replace('.svg', '');

  let type = resType.split('/')[0];

  if(resType.includes('deployments')) continue;

  if(type != oldType) resources = [];
	resources.push({
		type: resType,
		apiVersion: "1900-01-01",
		name: `test_${type}`,
    location: "westeurope",
  })

  saveTemplate(type, resources);
  oldType = type;
}

