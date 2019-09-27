//
// arm-parser.ts - ARM Parser 
// Class to parse ARM templates and return a set of elements for rendering with Cytoscape
// Ben Coleman, 2017
// Modified & updated for VS Code extension. Converted (crudely) to TypeScript, Oct 2019
//

import * as utils from './utils';
import * as path from 'path';
import axios from 'axios';
import TelemetryReporter from 'vscode-extension-telemetry';
import * as stripJsonComments from 'strip-json-comments';
const stripBom = require('strip-bom');
const jsonLint = require('jsonlint');
import { TextEditor } from 'vscode';

class ARMParser {
  template: any;
  error: any;
  currentExpression: any;
  currentResource: any;
  elements: any[];
  extensionPath: string;
  reporter: TelemetryReporter | undefined;
  editor: TextEditor | undefined;
  name: string;
  
  //
  // Create a new ARM Parser
  //
  constructor(extensionPath: string, name: string, reporter?: TelemetryReporter, editor?: TextEditor) {
    this.template = null;
    this.error = null;
    this.currentExpression = null;
    this.elements = [];
    this.extensionPath = extensionPath;
    this.reporter = reporter;
    this.editor = editor;
    this.name = name;
  }

  //
  // Load and parse a ARM template from given string
  //
  async parse(templateJSON: string): Promise<any[]> {
    console.log(`### ArmView: Start parsing JSON template: ${this.name}`);

    // Try to parse JSON file
    try {
      // Strip out BOM characters for those mac owning weirdos
      templateJSON = stripBom(templateJSON); 
      // ARM templates do allow comments, but it's not part of the JSON spec 
      templateJSON = stripJsonComments(templateJSON); 

      // Switched to jsonlint for more meaningful error messages
      this.template = jsonLint.parse(templateJSON);
    } catch(err) {
      err.message = "This file is not valid JSON, please correct the errors below\n\n" + err.message
      throw err;
    }

    // Some simple ARM validation
    if(!this.template.resources || !this.template.$schema) {
      throw new Error("File doesn't appear to be an ARM template, but is valid JSON");      
    }
        
    // First pass, fix types and assign ids with a hash function
    this._preProcess(this.template.resources, null);
    if(this.error) throw this.error;
    console.log(`### ArmView: Pre-process pass complete`);

    // 2nd pass, work on resources
    await this._processResources(this.template.resources);
    if(this.error) throw this.error;
    console.log(`### ArmView: Parsing complete, found ${this.elements.length} elements in template`);

    // return result elements
    return this.elements;
  }


  //
  // Get last parsed expression, if any
  //
  getLastExpression() {
    return this.currentExpression;
  }

  //
  // Get last parsed expression, if any
  //
  getLastResource() {
    return this.currentResource;
  }


  //
  // Pre-parser function, does some work to make life easier for the main parser 
  //
  private _preProcess(resources: any[], parentRes: any) {
    console.log(`### ArmView: Pre-process starting...`);
    resources.forEach(res => {
      try {
        // Resolve and eval resource name
        let match = res.name.match(/^\[(.*)\]$/);
        if(match) {
          res.name = this._evalExpression(match[1]);
        } 

        // Resolve and eval resource location
        if(res.location) {
          match = res.location.match(/^\[(.*)\]$/);
          if(match) {
            res.location = this._evalExpression(match[1]);
          } 
        }

        // Resolve and eval resource kind
        if(res.kind) {
          match = res.kind.match(/^\[(.*)\]$/);
          if(match) {
            res.kind = this._evalExpression(match[1]);
          } 
        }

        // Resolve and eval resource tags
        if(res.tags && typeof res.tags == "string") {
          match = res.tags.match(/^\[(.*)\]$/);
          if(match) {
            res.tags = this._evalExpression(match[1]);
          } 
        }     
        if(res.tags && typeof res.tags == "object") {
          Object.keys(res.tags).forEach(tagname => {
            let tagval = res.tags[tagname].toString();
            match = tagval.match(/^\[(.*)\]$/);
            if(match) {
              res.tags[tagname] = this._evalExpression(match[1]);
            } 
          });
        } 

        // Resolve and eval sku object
        if(res.sku && typeof res.sku == "object") {
          Object.keys(res.sku).forEach(propname => {
            let propval = res.sku[propname].toString();
            match = propval.match(/^\[(.*)\]$/);
            if(match) {
              res.sku[propname] = this._evalExpression(match[1]);
            } 
          });
        }   

        // Make all res types fully qualified, solves a lots of headaches
        if(parentRes)
          res.type = parentRes.type.toLowerCase() + '/' + res.type.toLowerCase();
        else
          res.type = res.type.toLowerCase();

        // Assign a hashed id & full qualified name
        res.id = utils.hashCode(this.name + '_' + res.type + '_' + res.name);
        res.fqn = res.type + '/' + res.name;
        
        // Recurse into nested resources
        if(res.resources) {
          this._preProcess(res.resources, res)
        }
      } catch (err) {
        this.error = err; //`Unable to pre-process ARM resources, template is probably invalid. ${ex}`
      }
    });
  }

  //
  // Main function to parse a resource, this will recurse into nested resources
  //
  private async _processResources(resources: any[]) {
    for(let res of resources) {
      try {
        this.currentResource = res.type + ": " + res.name
        let extraData: any;
        extraData = {}
  
        // Label is the last part of the resource type
        let label = res.type.replace(/^.*\//i, '');
  
        // Workout which icon image to use, no way to catch missing images client side 
        let img = '/img/arm/default.svg';
        let iconExists = require('fs').existsSync(path.join(this.extensionPath, `assets/img/arm/${res.type}.svg`))
        if(iconExists) {
          img = `/img/arm/${res.type}.svg`;
        } else {
          // API Management has about 7 million sub-resources, rather than include them all, we assign a custom default for APIM
          if(res.type.includes('apimanagement')) {
            img = '/img/arm/microsoft.apimanagement/default.svg';
          } else {
            // Send telemetry on missing icons, this helps me narrow down which ones to add in the future
            if(this.reporter) this.reporter.sendTelemetryEvent('missingIcon', { 'resourceType': res.type, 'resourceFQN': res.fqn });
            // Use default icon as nothing else found
            img = '/img/arm/default.svg';
          }
        }
        
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

        // Linux VM icon with Tux :)
        if(res.type.includes('microsoft.compute') && res.properties && res.properties.osProfile) {
          if(res.properties.osProfile.linuxConfiguration) {
            img = `/img/arm/microsoft.compute/virtualmachines-linux.svg`;
          }
        }
  
        // For linked templates
        let linkedNodeCount: number = 0;
        if(res.type == 'microsoft.resources/deployments' && res.properties.templateLink) {
          let linkUri = res.properties.templateLink.uri;
          let match = linkUri.match(/^\[(.*)\]$/);
          if(match) {
            linkUri = this._evalExpression(match[1]);
          }  
          extraData['template-url'] = linkUri;

          // OK let's try to handle linked templates shall we? O_O
          console.log("### ArmView: Processing linked template: " + linkUri);

          let subTemplate = "";
          try {
            // If we're REALLY lucky it will be an accessible public URL
            let result = await axios({ url: linkUri, responseType: 'text' })
            // Only required due to a bug in axios https://github.com/axios/axios/issues/907
            subTemplate = JSON.stringify(result.data);
            console.log("### ArmView: Linked template was fetched from external URL");
          } catch(err) {
            // That failed, in most cases we'll end up here 
            console.log("### ArmView: URL not available, will search filesystem");

            // This crazy code tries to search the loaded workspace for the file
            // if(vscode.workspace && this.editor) {
            if(this.editor) {
              // Why do we do this? It lets us use ARMParser without VS Code
              let vscode = await import('vscode'); // Voodoo argh! 

              let fileName = path.basename(linkUri)
              let jsonFileExtension = fileName.lastIndexOf('.json')
              if(jsonFileExtension > 0) {
                // strip junk after file name, could be unresolved vars or other stuff
                fileName = fileName.substr(0, jsonFileExtension+5);
                let dir = path.dirname(vscode.workspace.asRelativePath(this.editor.document.uri)).split(path.sep).pop();
                
                let search = `**/${dir}/**/${fileName}`
                if(dir == '.') search = `**/${fileName}`;
                console.log("### ArmView: Looking for "+search);
                let searchResult;
                try {
                  searchResult = await vscode.workspace.findFiles(search)
 
                  if(searchResult && searchResult.length > 0) {
                    console.log("### ArmView: Found & using file! "+searchResult[0]);
                    let fileContent = await vscode.workspace.fs.readFile(searchResult[0])
                    subTemplate = fileContent.toString()
                  }
                } catch(err) {
                  console.log("### ArmView: Warn! Local file error: "+err);
                }
              }
            }
          }

          // If we have some data in subTemplate we were success somehow reading the linked template
          if(subTemplate) {
            linkedNodeCount = await this._parseLinkedOrNested(res, subTemplate)
          } else {
            console.log("### ArmView: Warn! Unable to locate linked template");
          }
        }
        
        // For nested templates
        if(res.type == 'microsoft.resources/deployments' && res.properties.template) {
          let subTemplate;
          try {
            console.log("### ArmView: Processing nested template in: "+res.name);
            subTemplate = JSON.stringify(res.properties.template)
          } catch(err) {}

          // If we have some data
          if(subTemplate) {
            linkedNodeCount = await this._parseLinkedOrNested(res, subTemplate)
          } else {
            console.log("### ArmView: Warn! Unable to parse nested template");
          }
        }
        // Process resource tags, can be objects or strings
        if(res.tags && typeof res.tags == "object") {
          Object.keys(res.tags).forEach(tagname => {
            let tagval = res.tags[tagname];
            tagval = utils.encode(this._evalExpression(tagval));
            tagname = utils.encode(this._evalExpression(tagname));

            // Store tags in 'extra' node data
            extraData['Tag ' + tagname] = tagval;  
          })
        } else if(res.tags && typeof res.tags == "string") {
          extraData['tags'] = res.tags; 
        }

        // Process SKU
        if(res.sku && typeof res.sku == "object") {
          Object.keys(res.sku).forEach(skuname => {
            let skuval = res.sku[skuname];
            skuval = utils.encode(this._evalExpression(skuval));
            skuname = utils.encode(this._evalExpression(skuname));

            // Store SKU details in 'extra' node data
            extraData['SKU ' + skuname] = skuval;  
          });
        } else if(res.sku && typeof res.sku == "string") {
          extraData['sku'] = res.sku; 
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
  
        // Create the node for Cytoscape, basically this is WHY WE ARE HERE!
        let resNode: any = {
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
        }

        if(linkedNodeCount == 0) {    
          // Stick resource node in resulting elements list
          this.elements.push(resNode);
        } else {
          // This is a special group/container node for linked templates
          // We give it same name/label as the 'deployments' resource would have
          this.elements.push({ 
            group: "nodes", 
            data: { 
              name: utils.encode(res.name),
              label: label,
              id: res.id
            } 
          })
        }
  
        // Serious business - find the dependencies between resources
        if(res.dependsOn) {
          res.dependsOn.forEach((dep: string) => {
            
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
          await this._processResources(res.resources);
        }        
      } catch (err) {
        this.error = err;  //`Unable to process ARM resources, template is probably invalid. ${ex}`
      }
    } // end for
  }

  //
  // Create a link element between resources
  //
  private _addLink(r1: any, r2: any) {
    this.elements.push({
      group: "edges",
      data: {
        id: `${r1.id}_${r2.id}`,
        source: r1.id,
        target: r2.id
      }      
    })
  }

  private async _parseLinkedOrNested(res: any, subTemplate: string): Promise<number> {
    // If we've got some actual data, means we read the linked file somehow
    if(subTemplate) {
      let subParser = new ARMParser(this.extensionPath, res.name, this.reporter); 
      try {
        let linkRes = await subParser.parse(subTemplate);
        
        // This means we successfully resolved/loaded the linked deployment
        //linkedNodeCount = linkRes.length
        if(linkRes.length == 0) {
          console.log("### ArmView: Warn! Linked template contained no resources!");
        }
        
        for(let r of linkRes) {
          // This puts these sub-resources into the group
          r.data.parent = res.id;
          // Push linked resources into the main list
          this.elements.push(r);
        }  

        return linkRes.length
      } catch(err) {
        return 0
        // linked template parsing error here
      }
    } else {
      console.log("### ArmView: Warn! Unable to locate linked template");
    }
    return 0
  }
  //
  // Main ARM expression parser, attempts to evaluate and resolve ARM expressions into strings
  //
  private _evalExpression(exp: string): any {
    this.currentExpression = exp;

    // Catch some rare errors where non-strings are parsed
    if(typeof exp != "string")
      return exp;

    exp = exp.trim();

    // It looks like a function call with a property reference e.g foo().bar
    let match = exp.match(/(\w+)\((.*)\)\.(.*)/);
    let funcProps = undefined;
    if(match) {
      let funcName = match[1];
      let funcParams = match[2];
      funcProps = match[3];

      // Catch some special cases, with referenced properties, e.g. resourceGroup().location
      if(funcName == 'resourceGroup' && funcProps == 'id') return '{res-group-id}'; 
      if(funcName == 'resourceGroup' && funcProps == 'location') return '{res-group-location}'; 
      if(funcName == 'subscription' && funcProps == 'subscriptionid') return '{subscription-id}'; 
      if(funcName == 'deployment' && funcProps == 'name') return '{deployment-name}'; 

      if(funcName == 'variables') {
        return this._funcVarParam(this.template.variables, this._evalExpression(funcParams), funcProps);
      }     
      if(funcName == 'parameters') {
        return this._funcVarParam(this.template.parameters, this._evalExpression(funcParams), funcProps);
      }           
    }

    // It looks like a 'plain' function call
    match = exp.match(/(\w+)\((.*)\)/);
    if(match) {
      let funcName = match[1].toLowerCase();
      let funcParams = match[2];
      //console.log(`~~~ function: *${funcName}* |${funcParams}|`);
      
      if(funcName == 'variables') {
        return this._funcVarParam(this.template.variables, this._evalExpression(funcParams), '');
      }
      if(funcName == 'uniquestring') {
        return this._funcUniquestring(this._evalExpression(funcParams));
      }   
      if(funcName == 'concat') {
        return this._funcConcat(funcParams, '');
      }
      if(funcName == 'uri') {
        // Treat as concat
        return this._funcConcat(funcParams, '');
      }
      if(funcName == 'parameters') {
        return this._funcVarParam(this.template.parameters, this._evalExpression(funcParams), '');
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
  private _findResource(id: string) {
    return this.template.resources.find((res: any) => {
      // Simple match on substring is possible after 
      // fully resolving names & types
      return res.fqn.toLowerCase().includes(id.toLowerCase());
    });
  }

  //
  // Emulate the ARM function `variables()` and `parameters()` to reference template variables/parameters
  // The only difference is the source 
  //
  private _funcVarParam(source: any, varName: string, propAccessor: string) {
    if(!source) return "{undefined}";
    let findKey = Object.keys(source).find(key => varName == key);
    if(findKey) {

      let val;
      
      // For parameters we access `defaultValue`
      if(source == this.template.parameters) {
        val = source[findKey].defaultValue;
        // Without a defaultValue it is impossible to know what the parameters value could be!
        // So a fall-back out is to return the param name inside {}
        if(!val)
          return `{${this._evalExpression(varName)}}`
      } else {
        // For variables we use the actual value
        val = source[findKey];
      }

      // console.log(`### DEBUG: propAccessor: ` + propAccessor);
      // console.log(`### DEBUG: typeof val: ` + typeof(val));
      // console.log(`### DEBUG: val: ` + JSON.stringify(val));

      // Variables can be JSON objects, MASSIVE SIGH LOOK AT THIS INSANITY
      if(typeof(val) == 'object') {
        if(!propAccessor) {
          // We're dealing with an object and have no property accessor, nothing we can do
          return `{${JSON.stringify(val)}}`
        }
        
        // Hack to try to handle copyIndex, default to first item in array
        propAccessor = propAccessor.replace('copyIndex()', '0');

        // Use eval to access property, I'm not happy about it, but don't have a choice
        try {
          let evalResult = eval('val.' + propAccessor);

          if(typeof(evalResult) == 'undefined') {
            console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
            return "{undefined}";
          }

          if(typeof(evalResult) == 'string') {
            // variable references values can be expressions too, so down the rabbit hole we go...
            let match = evalResult.match(/^\[(.*)\]$/);
            if(match) {
              return this._evalExpression(match[1]);
            }
            return evalResult;
          }

          if(typeof(evalResult) == 'object') {
            // We got an object back, give up
            return `{${JSON.stringify(evalResult)}}`
          }
        } catch(err) {
          console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
          return "{undefined}"
        }
      }

      if(typeof(val) == 'string') {
        // variable values can be expressions too, so down the rabbit hole we go...
        let match = val.match(/^\[(.*)\]$/);
        if(match) {
          return this._evalExpression(match[1]);
        }
      }

      // Fall back
      return val;
    } else {
      console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
      return "{undefined}";
    }
  }

  //
  // Emulate the ARM function `uniqueString()` 
  //
  private _funcUniquestring(baseStr: string): string {
    let hash = utils.hashCode(baseStr);
    return Buffer.from(`${hash}`).toString('base64').substr(0, 14);
  }

  //
  // Emulate the ARM function `concat()` 
  //
  private _funcConcat(funcParams: string, joinStr: string) {
    let paramList = utils.parseParams(funcParams);

    var res = "";
    for(var p in paramList) {
      let param = paramList[p];
      try {
        param = param.trim();
      } catch(err) {}
      res += joinStr + this._evalExpression(param)
    }
    return res;
  }

  //
  // Emulate the ARM function `replace()` 
  //
  private _funcReplace(funcParams: string) {
    let paramList = utils.parseParams(funcParams);
    var input = this._evalExpression(paramList[0]);
    var search = this._evalExpression(paramList[1]);
    var replace = this._evalExpression(paramList[2]);
    
    return input.replace(search, replace);
  } 
  
  //
  // Emulate the ARM function `toLower()` 
  //
  private _funcToLower(funcParams: string) {
    return this._evalExpression(funcParams).toLowerCase();
  }

  //
  // Emulate the ARM function `toUpper()` 
  //
  private _funcToUpper(funcParams: string) {
    return this._evalExpression(funcParams).toUpperCase();
  }

  //
  // Emulate the ARM function `substring()` 
  //
  private _funcSubstring(funcParams: string) {
    let paramList = utils.parseParams(funcParams);
    var str = this._evalExpression(paramList[0]);
    var start = this._evalExpression(paramList[1]);
    var end = this._evalExpression(paramList[2]);
    
    return this._evalExpression(str).substring(start, end);
  }
}

export default ARMParser;