//
// arm-parser.ts - ARM Parser 
// Class to parse ARM templates and return a set of elements for rendering with Cytoscape
// Ben Coleman, 2017 & 2019
// Modified & updated for VS Code extension. Converted (crudely) to TypeScript, Oct 2019
//

const jsonLint = require('jsonlint');
import * as path from 'path';
import * as stripJsonComments from 'strip-json-comments';
import 'isomorphic-fetch';
import TelemetryReporter from 'vscode-extension-telemetry';
import { TextEditor } from 'vscode';
import { NodeCache } from 'node-cache';

import * as utils from './utils';
import ARMExpressionParser from './arm-exp-parser';
import { Template, CytoscapeNode, Resource } from './arm-parser-types';

export default class ARMParser {
  template: Template;
  expParser: ARMExpressionParser;
  error: Error | undefined;
  elements: CytoscapeNode[];
  iconBasePath: string;
  reporter: TelemetryReporter | undefined;
  editor: TextEditor | undefined;
  name: string;
  cache: NodeCache | undefined;
  
  //
  // Create a new ARM Parser
  //
  constructor(iconBasePath: string, name: string, reporter?: TelemetryReporter, editor?: TextEditor, cache?: NodeCache) {
    // Both of these are overwritten when parse() is called
    this.template = {$schema: '', parameters: {}, variables: {}, resources: []};
    this.expParser = new ARMExpressionParser(this.template);
    
    this.elements = [];
    this.iconBasePath = iconBasePath;
    this.reporter = reporter;
    this.editor = editor;
    this.name = name;

    // Cache only used for external URLs of linked templates
    this.cache = cache;
  }

  //
  // Load and parse a ARM template from given string
  //
  async parse(templateJSON: string, parameterJSON?: string): Promise<CytoscapeNode[]> {
    console.log(`### ArmView: Start parsing JSON template: ${this.name}`);
    this.elements = [];

    // Try to parse JSON file
    try {
      this.template = this.parseJSON(templateJSON);
    } catch(err) {
      throw err;
    }

    // Some simple validation it is an ARM template
    if(!this.template.resources || 
       !this.template.$schema || 
       !this.template.$schema.toString().toLowerCase().includes("deploymenttemplate.json")) {
      throw new Error("File doesn't appear to be an ARM template, but is valid JSON");      
    }

    // From here, we're pretty sure we're dealing with a legit and valid ARM template
    this.expParser = new ARMExpressionParser(this.template);
        
    // New first pass, apply supplied parameters if any
    if(parameterJSON) {
      this.applyParams(parameterJSON);
      if(this.error) throw this.error;
      console.log(`### ArmView: Parameter file applied`);
    }
    
    // First pass, fix types and assign ids with a hash function
    this.preProcess(this.template.resources, null);
    if(this.error) throw this.error;
    console.log(`### ArmView: Pre-process pass complete`);

    // 2nd pass, work on resources
    await this.processResources(this.template.resources);
    if(this.error) throw this.error;
    console.log(`### ArmView: Parsing complete, found ${this.elements.length} elements in template ${this.name}`);

    // return result elements
    return this.elements;
  }

  //
  // Try to parse JSON file with the various "relaxations" to the JSON spec that ARM permits
  //
  private parseJSON(content: string) {
    try {
      // Strip out BOM characters for those mac owning weirdos, not sure this is needed
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      
      // ARM templates do allow comments, but it's not part of the JSON spec 
      content = stripJsonComments(content); 

      // ARM also allows for multi-line strings, which is AWFUL
      // This is a crude attempt to cope with them by simply stripping the newlines if we find any

      // Find all strings in double quotes (thankfully JSON only allows double quotes)
      let re = /(".*?")/gims;
      let match;
      while ((match = re.exec(content)) != null) {
        let string = match[1];
        // Only work on strings that include a newline (or \n\r)
        if(string.includes('\n')) {
          console.log(`### ArmView: Found a multi-line string in your template at offset ${match.index}. Attempting to rectify to valid JSON`);
          
          // Mangle the content ripping the matched string out
          let front = content.substr(0, match.index);
          let back =  content.substr(match.index+string.length, content.length);
          // Brute force removal!
          // We preserve whitespace, but not sure if it's correct. We're outside the JSON spec!
          let cleanString = string.replace(/\n/g, ''); //string.replace(/\s*\n\s*/g, ' ');
          cleanString = cleanString.replace(/\r/g, '');

          // Glue it back together
          content = front + cleanString + back;
        }
      }

      // Switched to jsonlint for more meaningful error messages
      return jsonLint.parse(content);
    } catch(err) {
      err.message = "File is not valid JSON, please correct the error(s) below\n\n" + err.message;
      throw err;
    }
  }

  //
  // Pre-parser function, does some work to make life easier for the main parser 
  //
  private preProcess(resources: Resource[], parentRes: any) {
    console.log(`### ArmView: Pre-process starting...`);
    resources.forEach(res => {
      try {
        // Resolve and eval resource name
        res.name = this.expParser.eval(res.name, true);
        
        // Resolve and eval resource location
        if(res.location) {
          res.location = this.expParser.eval(res.location, true);
        }

        // Resolve and eval resource kind
        if(res.kind) {
          res.kind = this.expParser.eval(res.kind, true);
        }

        // Removed, I don't think this is ever valid in any template
        // if(res.tags && typeof res.tags == "string") {
        //   res.tags = this.expParser.eval(res.tags, true);
        // }     

        // Resolve and eval resource tags
        if(res.tags && typeof res.tags == "object") {
          Object.keys(res.tags).forEach(tagname => {
            let tagval = res.tags[tagname].toString();
            res.tags[tagname] = this.expParser.eval(tagval, true);
          });
        } 

        // Resolve and eval sku object
        if(res.sku && typeof res.sku == "object") {
          Object.keys(res.sku).forEach(propName => {
            if(res.sku) {
              let propVal = res.sku[propName].toString();
              res.sku[propName] = this.expParser.eval(propVal, true);
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
          this.preProcess(res.resources, res);
        }
      } catch (err) {
        this.error = err; //`Unable to pre-process ARM resources, template is probably invalid. ${ex}`
      }
    });
  }
  
  //
  // Pre-parser function, does some work to make life easier for the main parser 
  //
  private applyParams(parameterJSON: string) {
    // Try to parse JSON file
    let paramObject;

    // Try to parse JSON file
    try {
      paramObject = this.parseJSON(parameterJSON);
    } catch(err) {
      throw err;
    }
    
    // Some simple ARM parameters validation
    if(!paramObject.parameters || 
       !paramObject.$schema || 
       !paramObject.$schema.toString().toLowerCase().includes("deploymentparameters.json")) {
      throw new Error("File doesn't appear to be an ARM parameters file, but is valid JSON");      
    }    

    // Loop over all parameters
    for(let param in paramObject.parameters) {
      try {
        let pVal = paramObject.parameters[param].value;
        if(pVal !== "") {
          // A cheap trick to force value into `defaultValue` to be picked up later
          this.template.parameters[param].defaultValue = pVal;
        }
      } catch(err) {
        console.log(`### ArmView: Error applying parameter '${param}' Err: ${err}`);
      }
    }
  }

  //
  // Main function to parse a resource, this will recurse into nested resources
  //
  private async processResources(resources: Resource[]) {
    for(let res of resources) {
      try {
        let extraData: any;
        extraData = {};
  
        // Label is the last part of the resource type
        let label = res.type.replace(/^.*\//i, '');
  
        // Workout which icon image to use, no way to catch missing images client side so we do it here
        let img = 'default.svg';
        let iconExists = require('fs').existsSync(path.join(this.iconBasePath, `/${res.type}.svg`));
        if(iconExists) {
          img = `${res.type}.svg`;
        } else {
          // API Management has about 7 million sub-resources, rather than include them all, we assign a custom default for APIM
          if(res.type.includes('apimanagement')) {
            img = 'microsoft.apimanagement/default.svg';
          } else {
            // Send telemetry on missing icons, this helps me narrow down which ones to add in the future
            let fileHash = "";
            if(this.editor) {
              fileHash = this.editor.document.fileName;
              fileHash = utils.hashCode(this.editor.document.fileName);
            }
            // Send resource type, FQN and a hashed/obscured version of the filename
            if(this.reporter) this.reporter.sendTelemetryEvent('missingIcon', { 'resourceType': res.type, 'resourceFQN': res.fqn, 'fileHash': fileHash });

            // Use default icon as nothing else found
            img = 'default.svg';
          }
        }
        
        // App Services - Sites & plans can have different icons depending on 'kind'
        if(res.kind && res.type.includes('microsoft.web')) {
          if(res.kind.toLowerCase().includes('api')) img = `microsoft.web/apiapp.svg`;
          if(res.kind.toLowerCase().includes('mobile')) img = `microsoft.web/mobileapp.svg`;
          if(res.kind.toLowerCase().includes('function')) img = `microsoft.web/functionapp.svg`;
          if(res.kind.toLowerCase().includes('linux')) img = `microsoft.web/serverfarmslinux.svg`;
        }
        
        // Event grid subscriptions can sit under many resource types
        if(res.type.includes('eventsubscriptions')) {
          img = `microsoft.eventgrid/eventsubscriptions.svg`;
        }

        // Linux VM icon with Tux :)
        if(res.type.includes('microsoft.compute') && res.properties && res.properties.osProfile) {
          if(res.properties.osProfile.linuxConfiguration) {
            img = `microsoft.compute/virtualmachines-linux.svg`;
          }
        }
  
        // Handle linked templates, oh boy, this is a whole world of pain
        let linkedNodeCount: number = -1;
        if(res.type == 'microsoft.resources/deployments' && res.properties && res.properties.templateLink && res.properties.templateLink.uri) {
          let linkUri = res.properties.templateLink.uri;
          linkUri = this.expParser.eval(linkUri, true);

          // Strip off everything weird after file extension, i.e. after any ? or { characters we find
          let match = linkUri.match(/(.*?\.\w*?)($|\?|{)/);
          if(match) {
            linkUri = match[1];
          }
          extraData['template-url'] = linkUri;

          // OK let's try to handle linked templates shall we? O_O
          console.log("### ArmView: Processing linked template: " + linkUri);
           
          let subTemplate: string = "";
          var cacheResult = undefined;
          try {
            if(this.cache) {
              cacheResult = this.cache.get<string>(linkUri);
            }
            if (cacheResult == undefined) {
              // With some luck it will be an accessible directly via public URL
              
              // Use the isomorphic fetch to get the content of the URL, (Note. was using axios but that had bugs)
              // As fetch has no timeout we use a wrapper function and a 5sec timeout
              let fetchResult = await utils.timeoutPromise(5000, fetch(linkUri), "HTTP network timeout");
              if (!(fetchResult.status >= 200 && fetchResult.status < 300)) {
                throw new Error(`Fetch failed, status code: ${fetchResult.status}`);
              }
              
              // Traps those cases where a 200 + HTML page masks an error or 404
              let contentType = fetchResult.headers.get("Content-Type");
              if(contentType && contentType.includes('text/html')) {
                throw new Error("Returned data wasn't JSON!");
              }

              // Get the plain text body, don't need it in JSON
              subTemplate = await fetchResult.text();
              
              console.log("### ArmView: Linked template was fetched from external URL");
              
              // Cache results
              if(this.cache) {
                this.cache.set(linkUri, subTemplate);
                console.log("### ArmView: Cache available. Stored external URL result in cache");
              }
            } else {
              console.log("### ArmView: Cache hit, cached results used");
              subTemplate = cacheResult;
            }

          } catch(err) {
            // That failed, in most cases we'll end up here 
            console.log(`### ArmView: '${err}' URL not available, will search filesystem`);
            subTemplate = ""; // !IMPORTANT The above step might have failed but set subTemplate to invalid 

            // This crazy code tries to search the loaded workspace for the file, two different ways
            if(this.editor) {
              // Why do we do this? It lets us use this class without VS Code
              let vscode = await import('vscode'); // await on import! Voodoo!

              // File name only of linked template, we'll need this a LOT
              let fileName = path.basename(linkUri);

              // Try to guess directory it is in (don't worry if it's wrong, it might be)
              let linkParts = linkUri.split('/');
              let fileParentDir = linkParts[linkParts.length - 2];
                           
              // Try loading the from the workspace - assume file is in `fileParentDir` sub-folder
              // Most people store templates in a sub-folder and that sub-folder is included in the URL
              if(fileParentDir && fileName) { 
                // wsPath is local VS Code folder where the open editor doc is located
                let wsPath = path.dirname(this.editor.document.uri.toString());
                let filePath = `${wsPath}/${fileParentDir}/${fileName}`;
                console.log(`### ArmView: Will try to load file: ${filePath}`);
                
                // Let's give it a try and see if it's there and loads
                try {
                  let fileContent = await vscode.workspace.fs.readFile(vscode.Uri.parse(`${wsPath}/${fileParentDir}/${fileName}`));
                  subTemplate = fileContent.toString();
                } catch(err) {
                  console.log(`### ArmView: failed to load ${filePath}`);
                }
              }

              // Direct access didn't work, now try a glob search in workspace
              let wsLocalFile = path.basename(vscode.workspace.asRelativePath(this.editor.document.uri));
              // Only search if prev step failed and the filename we're looking for is NOT the same as the main template
              if(!subTemplate && fileName && wsLocalFile != fileName) {
                let wsLocalDir = path.dirname(vscode.workspace.asRelativePath(this.editor.document.uri)).split(path.sep).pop();

                let search = `**/${wsLocalDir}/**/${fileName}`;
                if(wsLocalDir == '.') search = `**/${fileName}`; // Handle case where folder is at root of ws
                console.log(`### ArmView: That didn't work. So will search workspace for: ${search}`);
                
                // Try to run the search
                let searchResult;
                try {
                  searchResult = await vscode.workspace.findFiles(search);

                  if(searchResult && searchResult.length > 0) {
                    console.log(`### ArmView: Found & using file: ${searchResult[0]}`);
                    let fileContent = await vscode.workspace.fs.readFile(searchResult[0]);
                    subTemplate = fileContent.toString();
                  }
                } catch(err) {
                  console.log("### ArmView: Warn! Local file error: "+err);
                }
              }
            }
          }

          // If we have some data in subTemplate we were successful somehow reading the linked template!         
          if(subTemplate) {
            linkedNodeCount = await this.parseLinkedOrNested(res, subTemplate);
          } else {
            console.log("### ArmView: Warn! Unable to locate linked template");
          }
        }
        
        // For nested templates
        if(res.type == 'microsoft.resources/deployments' && res.properties && res.properties.template) {
          let subTemplate;
          try {
            console.log("### ArmView: Processing nested template in: "+res.name);
            subTemplate = JSON.stringify(res.properties.template);
          } catch(err) {}

          // If we have some data
          if(subTemplate) {
            linkedNodeCount = await this.parseLinkedOrNested(res, subTemplate);
          } else {
            console.log("### ArmView: Warn! Unable to parse nested template");
          }
        }

        // Process resource tags, can be objects or strings
        if(res.tags && typeof res.tags == "object") {
          Object.keys(res.tags).forEach(tagname => {
            let tagval = res.tags[tagname];
            //tagval = utils.encode(this._evalExpression(tagval));
            // Some crazy people put expressions in their tag names, I mean really...
            tagname = utils.encode(this.expParser.eval(tagname));

            // Handle special case for displayName tag, which some people use. I dunno
            if(tagname.toLowerCase() == 'displayname') {
              res.name = tagval;
            }

            // Store tags in 'extra' node data
            extraData['Tag ' + tagname] = tagval;  
          });
        } else if(res.tags && typeof res.tags == "string") {
          extraData['tags'] = res.tags; 
        }

        // Process SKU
        if(res.sku && typeof res.sku == "object") {
          Object.keys(res.sku).forEach(skuname => {
            if(res.sku) {
              let skuval = res.sku[skuname];
              //skuval = utils.encode(this._evalExpression(skuval));
              //skuname = utils.encode(this._evalExpression(skuname));

              // Store SKU details in 'extra' node data
              extraData['SKU ' + skuname] = skuval;  
            }
          });
        } else if(res.sku && typeof res.sku == "string") {
          extraData['sku'] = res.sku; 
        }

        // Virtual Machines - Try and grab some of the VM info
        if(res.type == 'microsoft.compute/virtualmachines') {
          try {
            if(res.properties.osProfile.linuxConfiguration) {
              extraData.os = 'Linux';          
            } 
            if(res.properties.osProfile.windowsConfiguration) {
              extraData.os = 'Windows';          
            }  
            if(res.properties.osProfile.computerName) {
              extraData.hostname = utils.encode( this.expParser.eval(res.properties.osProfile.computerName) );
            }                              
            if(res.properties.osProfile.adminUsername) {
              extraData.user = utils.encode( this.expParser.eval(res.properties.osProfile.adminUsername) ); 
            }
            if(res.properties.hardwareProfile.vmSize) {
              extraData.size = utils.encode( this.expParser.eval(res.properties.hardwareProfile.vmSize) ); 
            } 
            if(res.properties.storageProfile.imageReference) {
              extraData.image = "";
              if(res.properties.storageProfile.imageReference.publisher) {extraData.image += this.expParser.eval(res.properties.storageProfile.imageReference.publisher);} 
              if(res.properties.storageProfile.imageReference.offer) {extraData.image += '/' + this.expParser.eval(res.properties.storageProfile.imageReference.offer);} 
              if(res.properties.storageProfile.imageReference.sku) {extraData.image += '/' + this.expParser.eval(res.properties.storageProfile.imageReference.sku);} 
            }                     
          } catch (ex) {
            console.log('### ArmView: Warn! Error when parsing VM resource details: ', res.name);
          }
        }      

        // Stick resource node in resulting elements list
        let cyNode = new CytoscapeNode('nodes');
        cyNode.data = {
          id: res.id,
          name: utils.encode(res.name),
          img: img,
          kind: res.kind ? res.kind : '',
          type: res.type,
          label: label,
          location: res.location ? utils.encode(res.location) : '',
          extra: extraData
        };
        this.elements.push(cyNode);
  
        // Serious business - find the dependencies between resources
        if(res.dependsOn) {
          res.dependsOn.forEach((dep: string) => {
            
            // Most dependsOn are not static strings, they will be expressions
            dep = this.expParser.eval(dep, true);
            
            // Find resource by eval'ed dependsOn string
            let depres = this.findResource(dep);
            // Then create a link between this resource and the found dependency 
            if(depres) this.addLink(res, depres);
          });          
        }
  
        // Now recurse into nested resources
        if(res.resources) {
          await this.processResources(res.resources);
        }        
      } catch (err) {
        this.error = err;  //`Unable to process ARM resources, template is probably invalid. ${ex}`
      }
    } // end for
  }

  //
  // Create a link element between resources
  //
  private addLink(r1: any, r2: any) {
    let edge = new CytoscapeNode('edges');
    edge.data = {
      id: `${r1.id}_${r2.id}`,
      source: r1.id,
      target: r2.id
    }; 
    this.elements.push(edge);
  }

  private async parseLinkedOrNested(res: any, subTemplate: string): Promise<number> {   
    // If we've got some actual data, means we read the linked file somehow
    if(subTemplate) {
      let subParser = new ARMParser(this.iconBasePath, res.name, this.reporter, this.editor, this.cache); 
      try {
        let linkRes = await subParser.parse(subTemplate);
        
        // This means we successfully resolved/loaded the linked deployment
        if(linkRes.length == 0) {
          console.log("### ArmView: Warn! Linked template contained no resources!");
        }
        
        for(let subres of linkRes) {
          if(subres) {
            // !IMPORTANT! Only set the parent if it's not already set
            // Otherwise we overwrite the value when working with multiple levels deep of linkage
            if(subres.data && !subres.data.parent)
            subres.data.parent = res.id;

            // Push linked resources into the main list
            this.elements.push(subres);
          }
        }  

        return linkRes.length;
      } catch(err) {
        return 0;
        // linked template parsing error here
      }
    } else {
      console.log("### ArmView: Warn! Unable to locate linked template");
    }
    return 0;
  }

  //
  // Locate a resource by resource id
  //
  private findResource(name: string) {
    return this.template.resources.find((res: any) => {
      // Simple match on substring is possible after fully resolving names & types
      // Switched to endsWith rather than include, less generous but more correct
      return res.fqn.toLowerCase().endsWith(name.toLowerCase());
      //return res.fqn.toLowerCase().includes(name.toLowerCase());
    });
  }
}