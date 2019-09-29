//
// ARM Viewer - VS Code Extension
// Ben Coleman, 2019
// Main Extension script
//

import * as vscode from 'vscode';
import * as path from 'path';
import ARMParser from './lib/arm-parser';
import TelemetryReporter from 'vscode-extension-telemetry';

// Set up telemetry logging
const pjson = require('../package.json');
const telemetryExtensionId = pjson.publisher + "." + pjson.name;
const telemetryExtensionVersion = pjson.version; 
const telemetryKey = '0e2a6ba6-6c52-4e94-86cf-8dc87830e82e'; 

// Main globals
var panel: vscode.WebviewPanel | undefined = undefined;
var extensionPath: string;
var editor: vscode.TextEditor;
var paramFileContent: string;
var filters: string;
var reporter: TelemetryReporter;

// Used to buffer/delay updates when typing
var refreshedTime: number = Date.now();
var typingTimeout: any;

//
// Main extension activation
//
export function activate(context: vscode.ExtensionContext) {
	extensionPath = context.extensionPath;

  context.subscriptions.push(
    vscode.commands.registerCommand('armView.start', () => {
			// Check for open editors that are showing JSON
			// These are safe guards, the `when` clauses in package.json should prevent this
			if(!vscode.window.activeTextEditor) {
				vscode.window.showErrorMessage("No editor active, open a ARM template JSON file in the editor");
				return;
			} else {
				if(!(vscode.window.activeTextEditor.document.languageId == "json" || vscode.window.activeTextEditor.document.languageId == "arm-template")) {
					vscode.window.showErrorMessage("Current file is not JSON");
					return;
				}
			}
			
			// Store the active editor at start
			editor = vscode.window.activeTextEditor;
			paramFileContent = "";

			if (panel) {
				// If we already have a panel, show it
				panel.reveal();
				return;
			} 

			// Create the panel (held globally)
      panel = vscode.window.createWebviewPanel(
        'armViewer',
        'ARM Viewer',
        vscode.ViewColumn.Beside,
				{ 
					enableScripts: true,
					localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'assets'))]
				}
			);

			// Give panel a custom icon
			panel.iconPath = { 
				dark: vscode.Uri.file(`${extensionPath}/assets/img/icons/eye-dark.svg`),
				light: vscode.Uri.file(`${extensionPath}/assets/img/icons/eye-light.svg`)
			}	
			
			reporter = new TelemetryReporter(telemetryExtensionId, telemetryExtensionVersion, telemetryKey);
			context.subscriptions.push(reporter);

			// Load the webview HTML/JS
			panel.webview.html = getWebviewContent();
			
			// Listen for active document changes, i.e. user typing
			vscode.workspace.onDidChangeTextDocument(event => {
				//console.log("### onDidChangeTextDocument");
				
				// If an update is scheduled, then skip
				if(typingTimeout) return;

				// Buffer/delay updates by 1.5 seconds
				if(Date.now() - refreshedTime < 1500) {
					typingTimeout = setTimeout(refreshView, 1500);
					return;
				}
				
				try {
					refreshView();
				} catch(err) {}
			});

			// Listen for active editor changes
			vscode.window.onDidChangeActiveTextEditor(event => {
				//console.log("### onDidChangeActiveTextEditor");
				try {
					// Switch editor and refresh
					if(vscode.window.activeTextEditor) {
						if(editor.document.fileName != vscode.window.activeTextEditor.document.fileName) {
							paramFileContent = "";
							if(panel) panel.webview.postMessage({ command: 'paramFile', payload: "" });
							editor = vscode.window.activeTextEditor;
							refreshView();
						}
					}
				} catch(err) {}
			});

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
        message => {

					// Initial load of content, done at startup
          if (message.command == 'initialized') {
						refreshView();
					}
					
					if (message.command == 'applyParameters') {						
						applyParameters();
					}
					
					if (message.command == 'applyFilters') {						
						applyFilters();
          }					
        },
        undefined,
        context.subscriptions
			);

			// Dispose/cleanup
			panel.onDidDispose(
        () => {
					reporter.dispose();
					panel = undefined
					clearTimeout(typingTimeout)
				},
        null,
        context.subscriptions
      );
    })
  );
}

//
// Prompt user for parameter file and apply it to the parser
//
async function applyParameters() {
	let wsLocalDir = path.dirname(editor.document.fileName)

	if(wsLocalDir) {
		let paramFile = await vscode.window.showOpenDialog({defaultUri: vscode.Uri.file(wsLocalDir), canSelectMany: false, filters:{ JSON: ['json'] } } );

		if(paramFile) {
			let res  = await vscode.workspace.fs.readFile(paramFile[0]);
			if(res) {
				paramFileContent = res.toString();
				let paramFileName = vscode.workspace.asRelativePath(paramFile[0]);
				if(panel) panel.webview.postMessage({ command: 'paramFile', payload: paramFileName });
			} 
		}
	}
	refreshView();
}

//
// Prompt user for resource filters
//
async function applyFilters() {
	let res = await vscode.window.showInputBox({ prompt: 'Comma separated list of resource types to filter out. Can be partial strings. Empty string will remove all filters', value: filters, placeHolder: 'e.g. vaults/secrets, securityRules' });
	if(res) {
		filters = res.toString();
	} else {
		filters = "";
	}
	if(panel) panel.webview.postMessage({ command: 'filtersApplied', payload: filters });
	refreshView();
}

//
// Refresh contents of the view
//
async function refreshView() {
	// Reset timers for typing updates
	refreshedTime = Date.now();
	typingTimeout = undefined;

	if(!panel)
		return

	if(editor) {
		// Skip non-JSON
		if(!(editor.document.languageId == "json" || editor.document.languageId == "arm-template")) {
			return;
		}

		// Parse the source template JSON
		let templateJSON = editor.document.getText();
		var parser = new ARMParser(extensionPath, "main", reporter, editor);    
		try {
			let result = await parser.parse(templateJSON, paramFileContent);			
			reporter.sendTelemetryEvent('parsedOK', {'nodeCount': result.length.toString(), 'filename': editor.document.fileName});
			panel.webview.postMessage({ command: 'refresh', payload: result });
			panel.webview.postMessage({ command: 'resCount', payload: result.length.toString() });
		} catch(err) {
			console.log('### ArmView: ERROR STACK: ' + err.stack)
			reporter.sendTelemetryEvent('parseError', {'error': err, 'filename': editor.document.fileName});
			panel.webview.postMessage({ command: 'error', payload: err.message })
		}
	} else {
		vscode.window.showErrorMessage("No editor active, open a ARM template JSON file in the editor")
	}
};

//
// Initialize the contents of the webview - called at startup
//
function getWebviewContent() {	
	// Send telemetry for activation 
	let wsname: string = vscode.workspace.name || "unknown";
	reporter.sendTelemetryEvent('activated', {'workspace': wsname});

	if(!panel)
		return "";

	const mainScriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'main.js')));
	const mainCss = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'css', 'main.css')));
	const cytoscapeUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'vendor', 'cytoscape.min.js')));
	const prefix = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets')));

	const cytoscapeSnapUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'vendor', 'cytoscape-snap-to-grid.js')));
	const jqueryUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'vendor', 'jquery-3.4.1.slim.min.js')));

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<script src="${jqueryUri}"></script>
	<script src="${cytoscapeUri}"></script>
	<script src="${cytoscapeSnapUri}"></script>

	<script src="${mainScriptUri}"></script>

	<link href="${mainCss}" rel="stylesheet" type="text/css">

	<title>ARM Viewer</title>
</head>
<body>
	<div id="error">
		<div id="errortitle">⚠️ Parser Error</div>
		<div id="errormsg"></div>
	</div>

	<div id="buttons">
		<button onclick="toggleLabels()"><img src="${prefix}/img/toolbar/labels.svg">&nbsp;  Labels</button>
		<button onclick="cy.fit()"><img src="${prefix}/img/toolbar/fit.svg">&nbsp; Re-fit</button>
		<button onclick="toggleSnap()" id="snapbut"><img src="${prefix}/img/toolbar/snap.svg">&nbsp; Snap</button>
		<button onclick="reLayout()"><img src="${prefix}/img/toolbar/layout.svg">&nbsp; Layout</button>
		&nbsp;&nbsp;	
		<button onclick="applyParameters()"><img src="${prefix}/img/toolbar/params.svg">&nbsp; Params</button>
		<button onclick="applyFilters()"><img src="${prefix}/img/toolbar/filter.svg">&nbsp; Filter</button>
		&nbsp;&nbsp;
		<button onclick="reload()"><img src="${prefix}/img/toolbar/reload.svg">&nbsp; Reload</button>
	</div>

	<div class="loader"></div>

	<div id="mainview"></div>

	<div id="statusbar">
	  Objects: <span id="statusResCount">0</span> &nbsp | &nbsp
		Snap to grid: <span id="statusSnap">Off</span> &nbsp | &nbsp
		Parameters: <span id="statusParams">none</span> &nbsp | &nbsp
		Filters: <span id="statusFilters">none</span>
	</div>

	<div id="infobox">
	  <div class="panel-heading" onclick="hideInfo()"><img id="infoimg" src=''/> &nbsp; Resource Details</div>
    <div class="panel-body">
      <table id="infotable">    
      </table>
    </div>
	</div>

	<script>
		var filters = "";
		// Message handler in webview, messages are sent by extension
		window.addEventListener('message', event => {
			const message = event.data;

			if(message.command == 'refresh') {
				document.getElementById('error').style.display = "none"
				document.querySelector('.loader').style.display = "none"
				document.getElementById('mainview').style.display = "block"
				document.getElementById('buttons').style.display = "block"
				document.getElementById('statusbar').style.display = "block"
				displayData(message.payload, filters);
			}

			if(message.command == 'error') {
				document.getElementById('errormsg').innerHTML = message.payload
				document.getElementById('error').style.display = "block"
				document.querySelector('.loader').style.display = "none"
				document.getElementById('mainview').style.display = "none"
				document.getElementById('buttons').style.display = "none"
				document.getElementById('statusbar').style.display = "none"
			}		

			if(message.command == 'paramFile') {
				if(message.payload) {
					document.getElementById('statusParams').innerHTML = message.payload
				} else {
					document.getElementById('statusParams').innerHTML = "none"
				}
			}

			if(message.command == 'filtersApplied') {
				filters = message.payload;
				if(filters == "" && !filters) {
					document.getElementById('statusFilters').innerHTML = "none"
				} else {
					document.getElementById('statusFilters').innerHTML = filters
				}
			}			
			
			if(message.command == 'resCount') {
				if(message.payload) {
					document.getElementById('statusResCount').innerHTML = message.payload;
				}
			}
		});

		// Loaded from main.js, init Cytoscape and canvas
		init("${prefix}")

		function applyParameters() {
			try {
				document.getElementById('statusbar').style.display = "none"
				document.getElementById('mainview').style.display = "none"
				document.querySelector('.loader').style.display = "block"
				vscode.postMessage({ command: 'applyParameters' });
			} catch(err) {
				console.log(err)
			}
		}

		function applyFilters() {
			try {
				document.getElementById('statusbar').style.display = "none"
				document.getElementById('mainview').style.display = "none"
				document.querySelector('.loader').style.display = "block"
				vscode.postMessage({ command: 'applyFilters' });
			} catch(err) {
				console.log(err)
			}
		}

		function reload() {
			try {
				document.getElementById('buttons').style.display = "block"
				document.getElementById('error').style.display = "none"
				document.getElementById('mainview').style.display = "none"
				document.querySelector('.loader').style.display = "block"
				vscode.postMessage({ command: 'initialized' });
			} catch(err) {
				console.log(err)
			}
		}		
  </script>
</body>
</html>`;
}
