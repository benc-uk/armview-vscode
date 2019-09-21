//
// arm-parser.js - ARM Parser 
// Class to parse ARM templates and return a set of elements for rendering with Cytoscape
// Ben Coleman, 2017
//

const utils = require('./utils');
const jsonlint = require('jsonlint');
import * as path from 'path';

class ARMParser {
  //
  // Load and parse a ARM template from given string
  //
  constructor(templateJSON, path) {
    console.log('### Start parsing template...');
    this.template = null;
    this.error = null;
    this.elements = [];
    this.extensionPath = path
    
    // Handle BOM characters for those Mac weirdos
    const stripBom = require('strip-bom');
    templateJSON = stripBom(templateJSON);

    // Try to parse JSON file
    try {
      // Switched to jsonlint for more meaningful error messages
      this.template = jsonlint.parse(templateJSON)
      //this.template = JSON.parse(templateJSON);
    } catch(e) {
      this.error = e.message;
      return;
    }

    // Some simple ARM validation
    if(!this.template.resources || !this.template.$schema) {
      this.error = `OK that might be JSON, but I don't think that's a valid ARM template!`;
      return;      
    }
        
    // first pass, fix types and assign ids with a hash function
    this._preProcess(this.template.resources, null);
    if(this.error) return;

    // 2nd pass, work on resources
    this._processResources(this.template.resources);
    if(this.error) return;
    console.log(`### Parsing complete, found ${this.elements.length} elements in template`);
  }

  //
  // Call this to get the parsed result, a set of elements to display in Cytoscape
  //
  getResult() {
    return this.elements;
  }

  //
  // Get error message, if any
  //
  getError() {
    return this.error;
  }

  // ***** All methods from here are considered private *****

  //
  // Pre-parser function, does some work to make life easier for the main parser 
  //
  _preProcess(resources, parentRes) {
    resources.forEach(res => {
      try {
        // Resolve and eval resource name
        let match = res.name.match(/^\[(.*)\]$/);
        if(match) {
          res.name = this._evalExpression(match[1]);
        } 
        // Resolve and eval resource location
        if(res.location){
          match = res.location.match(/^\[(.*)\]$/);
          if(match) {
            res.location = this._evalExpression(match[1]);
          } 
        }
        // Resolve and eval resource kind
        if(res.kind){
          match = res.kind.match(/^\[(.*)\]$/);
          if(match) {
            res.kind = this._evalExpression(match[1]);
          } 
        }        

        // Make all res types fully qualified, solves a lots of headaches
        if(parentRes)
          res.type = parentRes.type.toLowerCase() + '/' + res.type.toLowerCase();
        else
          res.type = res.type.toLowerCase();

        // Assign a hashed id & full qualified name
        res.id = utils.hashCode(res.type + '_' + res.name);
        res.fqn = res.type + '/' + res.name;
        
        // Recurse into nested resources
        if(res.resources) {
          this._preProcess(res.resources, res)
        }
      } catch (ex) {
        this.error = `Unable to pre-process ARM resources, template is probably invalid. Bummer! ${ex}`
      }
    });
  }

  //
  // Main function to parse a resource, this will recurse into nested resources
  //
  _processResources(resources) {
    resources.forEach(res => {
      try {
        let name = res.name;
        let extraData = {};
  
        // Label is the last part of the resource type
        let label = res.type.replace(/^.*\//i, '');
  
        // Set default image, no way to catch 404 on client side :/
        let img = `/img/arm/default.svg`;
        if(require('fs').existsSync(path.join(this.extensionPath, `assets/img/arm/${res.type}.svg`)))
          img = `/img/arm/${res.type}.svg`;
        
        // App Services - Sites & plans can have different icons depending on 'kind'
        if(res.kind && res.type.includes('microsoft.web')) {
          if(res.kind.toLowerCase().includes('api')) img = `/img/arm/microsoft.web/apiapp.svg`;
          if(res.kind.toLowerCase().includes('mobile')) img = `/img/arm/microsoft.web/mobileapp.svg`;
          if(res.kind.toLowerCase().includes('function')) img = `/img/arm/microsoft.web/functionapp.svg`;
          if(res.kind.toLowerCase().includes('linux')) img = `/img/arm/microsoft.web/serverfarmslinux.svg`;
        }
        
        // Event grid subscriptions can sit under many resource types
        if(res.type.includes('eventsubscriptions')) {
          img = `/img/arm/microsoft.eventgrid/eventsubscriptions.svg`;
        }

        if(res.type.includes('microsoft.compute') && res.properties && res.properties.osProfile) {
          if(res.properties.osProfile.linuxConfiguration) {
            img = `/img/arm/microsoft.compute/virtualmachines-linux.svg`;
          }
        }
  
        // For nested/linked templates
        if(res.type == 'microsoft.resources/deployments' && res.properties.templateLink) {
          extraData['template-url'] = this._evalExpression(res.properties.templateLink.uri);
        }
  
        // Process resource tags
        if(res.tags) {
          Object.keys(res.tags).forEach(tagname => {
            let tagval = res.tags[tagname];
            tagval = utils.encode(this._evalExpression(tagval));
            tagname = utils.encode(this._evalExpression(tagname));
            extraData[tagname] = tagval;  
          })
        }

        // Virtual Machines - Try and grab some of the VM info
        if(res.type == 'microsoft.compute/virtualmachines') {
          try {
            if(res.properties.osProfile.linuxConfiguration) {
              extraData.os = 'Linux'          
            } 
            if(res.properties.osProfile.windowsConfiguration) {
              extraData.os = 'Windows'          
            }  
            if(res.properties.osProfile.computerName) {
              extraData.hostname = utils.encode( this._evalExpression(res.properties.osProfile.computerName) );
            }                              
            if(res.properties.osProfile.adminUsername) {
              extraData.user = utils.encode( this._evalExpression(res.properties.osProfile.adminUsername) ); 
            }
            if(res.properties.hardwareProfile.vmSize) {
              extraData.size = utils.encode( this._evalExpression(res.properties.hardwareProfile.vmSize) ); 
            } 
            if(res.properties.storageProfile.imageReference) {
              extraData.image = "";
              if(res.properties.storageProfile.imageReference.publisher) {extraData.image += this._evalExpression(res.properties.storageProfile.imageReference.publisher);} 
              if(res.properties.storageProfile.imageReference.offer) {extraData.image += '/'+this._evalExpression(res.properties.storageProfile.imageReference.offer);} 
              if(res.properties.storageProfile.imageReference.sku) {extraData.image += '/'+this._evalExpression(res.properties.storageProfile.imageReference.sku);} 
            }                     
          } catch (ex) {
            console.log('ERROR! Error when parsing VM resource: ', res.name);
          }
        }      
  
        // Stick resource node in resulting elements list
        this.elements.push({
          group: "nodes",
          data: {
            id: res.id,
            name: utils.encode(res.name),
            img: img,
            kind: res.kind ? res.kind : '',
            type: res.type,
            label: label,
            location: utils.encode(res.location),
            extra: extraData
          }
        });
  
        // Serious business - find the dependencies between resources
        if(res.dependsOn) {
          res.dependsOn.forEach(dep => {
            
            // Most dependsOn are not static strings, they will be expressions
            let match = dep.match(/^\[(.*)\]$/);
            if(match) {
              dep = this._evalExpression(match[1]);
            }  
  
            // Find resource by eval'ed dependsOn string
            let depres = this._findResource(dep);
            // Then create a link between this resource and the found dependency 
            if(depres) this._addLink(res, depres);
          });          
        }
  
        // Now recurse into nested resources
        if(res.resources) {
          this._processResources(res.resources);
        }        
      } catch (ex) {
        this.error = `Unable to process ARM resources, template is probably invalid. Bummer! ${ex}`
      }
    })    
  }

  //
  // Create a link element between resources
  //
  _addLink(r1, r2) {
    this.elements.push({
      group: "edges",
      data: {
        id: `${r1.id}_${r2.id}`,
        source: r1.id,
        target: r2.id
      }      
    })
  }

  //
  // Main ARM expression parser, attempts to evaluate and resolve ARM expressions into strings
  //
  _evalExpression(exp) {
    exp = exp.trim();

    // catch special cases, with referenced properties, e.g. resourceGroup().location
    let match = exp.match(/(\w+)\((.*)\)\.(.*)/);
    if(match) {
      let funcName = match[1].toLowerCase();
      let funcParams = match[2];
      let funcProps = match[3].toLowerCase();
      if(funcName == 'resourcegroup' && funcProps == 'id') return 'resource-group-id'; 
      if(funcName == 'resourcegroup' && funcProps == 'location') return 'resource-group-location'; 
      if(funcName == 'subscription' && funcProps == 'subscriptionid') return 'subscription-id'; 
      if(funcName == 'deployment' && funcProps == 'name') return 'deployment-name'; 
    }
    
    // It looks like a function
    match = exp.match(/(\w+)\((.*)\)/);
    if(match) {
      let funcName = match[1].toLowerCase();
      let funcParams = match[2];
      //console.log(`~~~ function: *${funcName}* |${funcParams}|`);
      
      if(funcName == 'variables') {
        return this._funcVariables(this._evalExpression(funcParams));
      }
      if(funcName == 'uniquestring') {
        return this._funcUniquestring(this._evalExpression(funcParams));
      }   
      if(funcName == 'concat') {
        return this._funcConcat(funcParams, '');
      }
      if(funcName == 'parameters') {
        // This is a small cop out, but we can't know the value of parameters until deployment!
        // So we just display curly braces around the paramter name. It looks OK
        return `{{${this._evalExpression(funcParams)}}}`;
      }  
      if(funcName == 'replace') {
        return this._funcReplace(funcParams);
      }      
      if(funcName == 'tolower') {
        return this._funcToLower(funcParams);
      }        
      if(funcName == 'toupper') {
        return this._funcToUpper(funcParams);
      } 
      if(funcName == 'substring') {
        return this._funcSubstring(funcParams);
      }    
      if(funcName == 'resourceid') {
        // Treat resourceId as a concat operation with slashes 
        let resid = this._funcConcat(funcParams, '/');
        // clean up needed
        resid = resid.replace(/^\//, '');
        resid = resid.replace(/\/\//, '/');
        return resid;
      }            
    }

    // It looks like a string literal
    match = exp.match(/^\'(.*)\'$/);
    if(match) {
      return match[1];
    }

    // It looks like a number literal
    match = exp.match(/^(\d+)/);
    if(match) {
      return match[1].toString();
    }

    // Catch all, just return the expression, unparsed
    return exp;
  }

  //
  // Locate a resource by resource id
  //
  _findResource(id) {
    return this.template.resources.find(res => {
      // Simple match on substring is possible after 
      // fully resolving names & types
      return res.fqn.toLowerCase().includes(id.toLowerCase());
    });
  }

  //
  // Emulate the ARM function `variables()` to reference template variables
  //
  _funcVariables(varName) {
    if(!this.template.variables) return "variables-missing";
    let findKey = Object.keys(this.template.variables).find(key => varName == key);
    if(findKey) {
      let val = this.template.variables[findKey];

      // Variables can be JSON objects, give up at this point
      if(typeof(val) != 'string') return "variable-obj";

      // variable values can be expressions too, so down the rabbit hole we go...
      let match = val.match(/^\[(.*)\]$/);
      if(match) {
        return this._evalExpression(match[1]);
      }
      return val;
    } else {
      return "undefined-var";
    }
  }

  //
  // Emulate the ARM function `uniqueString()` 
  //
  _funcUniquestring(baseStr) {
    let out = utils.hashCode(baseStr);
    out = Buffer(`${out}`).toString('base64');
    return out;
  }

  //
  // Emulate the ARM function `concat()` 
  //
  _funcConcat(funcParams, joinStr) {
    let paramList = utils.parseParams(funcParams);

    var res = "";
    for(var p in paramList) {
      let param = paramList[p];
      param = param.trim();
      res += joinStr + this._evalExpression(param)
    }
    return res;
  }

  //
  // Emulate the ARM function `replace()` 
  //
  _funcReplace(funcParams) {
    let paramList = utils.parseParams(funcParams);
    var input = this._evalExpression(paramList[0]);
    var search = this._evalExpression(paramList[1]);
    var replace = this._evalExpression(paramList[2]);
    
    return input.replace(search, replace);
  } 
  
  //
  // Emulate the ARM function `toLower()` 
  //
  _funcToLower(funcParams) {
    return this._evalExpression(funcParams).toLowerCase();
  }

  //
  // Emulate the ARM function `toUpper()` 
  //
  _funcToUpper(funcParams) {
    return this._evalExpression(funcParams).toUpperCase();
  }

  //
  // Emulate the ARM function `substring()` 
  //
  _funcSubstring(funcParams) {
    let paramList = utils.parseParams(funcParams);
    var str = this._evalExpression(paramList[0]);
    var start = this._evalExpression(paramList[1]);
    var end = this._evalExpression(paramList[2]);
    
    return this._evalExpression(str).substring(start, end);
  }
}

module.exports = ARMParser;