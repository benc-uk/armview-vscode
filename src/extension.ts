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
const packageJson = require('../package.json');
const telemetryExtensionId = packageJson.publisher + "." + packageJson.name;
const telemetryExtensionVersion = packageJson.version; 
const telemetryKey = '0e2a6ba6-6c52-4e94-86cf-8dc87830e82e'; 

// Main globals
var panel: vscode.WebviewPanel | undefined = undefined;
var extensionPath: string;
var themeName: string;
var editor: vscode.TextEditor;
var paramFileContent: string;
var filters: string;
var reporter: TelemetryReporter;

// Used to buffer/delay updates when typing
var refreshedTime: number = Date.now();
var typingTimeout: NodeJS.Timeout | undefined = undefined;

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

			themeName = vscode.workspace.getConfiguration('armView').get('iconTheme', 'original');
			console.log(`### ArmView: Activating ${extensionPath} with theme ${themeName}`);
		
			if(panel) {
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

				// Buffer/delay updates by 2 seconds
				if(Date.now() - refreshedTime < 2000) {
					typingTimeout = setTimeout(refreshView, 2000);
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
							// Wipe param file on switch
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
						console.log("### ArmView: Initialization of WebView complete, now parsing template...");
						refreshView();
					}
					
					// Message from webview - user clicked 'Params' button
					if (message.command == 'paramsClicked') {						
						pickParamsFile();
					}
					
					// Message from webview - user clicked 'Filters' button
					if (message.command == 'filtersClicked') {						
						pickFilters();
					}

					// Message from webview - user clicked 'Filters' button
					if (message.command == 'exportPNG') {											
						savePNG(message.payload);
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
					if(typingTimeout)
						clearTimeout(typingTimeout)
				},
        null,
        context.subscriptions
      );
    })
  );
}

async function savePNG(pngBase64: string) {
	let saveAs = await vscode.window.showSaveDialog({ saveLabel: "Save PNG", filters: {'Images': ['png']} });
	if(saveAs) {
		let buf = Buffer.from(pngBase64, 'base64');
		vscode.workspace.fs.writeFile(saveAs, buf)
	}
}

//
// Prompt user for parameter file and apply it to the parser
//
async function pickParamsFile() {
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
async function pickFilters() {
	let res = await vscode.window.showInputBox({ prompt: 'Comma separated list of resource types to filter out. Can be partial strings. Empty string will remove all filters', value: filters, placeHolder: 'e.g. vaults/secrets, securityRules' });
	if(res) {
		filters = res.toString().toLowerCase();
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
	if(typingTimeout)
		clearTimeout(typingTimeout);
	typingTimeout = undefined

	if(!panel)
		return;

	if(editor) {
		// Skip non-JSON
		if(!(editor.document.languageId == "json" || editor.document.languageId == "arm-template")) {
			return;
		}

		// Parse the source template JSON
		let templateJSON = editor.document.getText();
		
		// Create a new ARM parser, giving icon prefix based on theme, and name it "main"
		// Additionally passing reporter and editor enables telemetry and linked template discovery in VS Code workspace
		var parser = new ARMParser(`${extensionPath}/assets/img/azure/${themeName}`, "main", reporter, editor);    
		
		try {
			let result = await parser.parse(templateJSON, paramFileContent);			
			reporter.sendTelemetryEvent('parsedOK', {'nodeCount': result.length.toString(), 'filename': editor.document.fileName});
			panel.webview.postMessage({ command: 'newData', payload: result });
			panel.webview.postMessage({ command: 'resCount', payload: result.length.toString() });
		} catch(err) {
			// Disable logging and telemetry for now
			//console.log('### ArmView: ERROR STACK: ' + err.stack)
			//reporter.sendTelemetryEvent('parseError', {'error': err, 'filename': editor.document.fileName});
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
	
	const assetsPath = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets')));
	const iconThemeBase = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'img', 'azure', themeName))).toString();

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<script src="${assetsPath}/js/vendor/jquery-3.4.1.slim.min.js"></script>
	<script src="${assetsPath}/js/vendor/cytoscape.min.js"></script>
	<script src="${assetsPath}/js/vendor/cytoscape-snap-to-grid.js"></script>

	<script src="${assetsPath}/js/main.js"></script>

	<link href="${assetsPath}/css/main.css" rel="stylesheet" type="text/css">

	<title>ARM Viewer</title>
</head>
<body>
	<div id="error">
		<div id="errortitle">⚠️ Parser Error</div>
		<div id="errormsg"></div>
	</div>

	<div id="buttons">
		<button onclick="toggleLabels()"><img src="${assetsPath}/img/toolbar/labels.svg">&nbsp; Labels</button>
		<button onclick="cy.fit()"><img src="${assetsPath}/img/toolbar/fit.svg">&nbsp; Re-fit</button>
		<button onclick="toggleSnap()" id="snapbut"><img src="${assetsPath}/img/toolbar/snap.svg">&nbsp; Snap</button>
		Layout:
		<button onclick="reLayout('breadthfirst', true)"><img src="${assetsPath}/img/toolbar/tree.svg"></button>
		<button onclick="reLayout('grid', true)"><img src="${assetsPath}/img/toolbar/grid.svg"></button>
		<!--button onclick="reLayout('cose', true)"><img src="${assetsPath}/img/toolbar/cose.svg"></button-->
		&nbsp;&nbsp;	
		<button onclick="sendMessage('paramsClicked')"><img src="${assetsPath}/img/toolbar/params.svg">&nbsp; Params</button>
		<button onclick="sendMessage('filtersClicked')"><img src="${assetsPath}/img/toolbar/filter.svg">&nbsp; Filter</button>
		&nbsp;&nbsp;
		<button onclick="sendMessage('initialized')"><img src="${assetsPath}/img/toolbar/reload.svg">&nbsp; Reload</button>
		<button onclick="exportPNG()"><img src="${assetsPath}/img/toolbar/export.svg">&nbsp; Export</button>
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
      <table id="infotable"></table>
    </div>
	</div>

	<script>
		// **** Init Cytoscape and canvas (function in main.js) ****
		init("${iconThemeBase}");
	</script>

</body>
</html>`;
}
