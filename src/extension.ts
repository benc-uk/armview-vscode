import * as vscode from 'vscode';
import * as path from 'path';
const ARMParser = require('./lib/arm-parser');

var panel: vscode.WebviewPanel;
var extensionPath: string;

//
//
//
export function activate(context: vscode.ExtensionContext) {
	extensionPath = context.extensionPath

  context.subscriptions.push(
    vscode.commands.registerCommand('armView.start', () => {
			if(!vscode.window.activeTextEditor) {
				vscode.window.showErrorMessage("No editor active, open a ARM template JSON file in the editor")
				return;
			} else {
				if(vscode.window.activeTextEditor.document.languageId != "json") {
					vscode.window.showErrorMessage("Current file is not JSON")
					return;
				}
			}

      panel = vscode.window.createWebviewPanel(
        'armViewer',
        'ARM Viewer',
        vscode.ViewColumn.Beside,
				{ 
					enableScripts: true,
					localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'assets'))]
				}
			);

			panel.iconPath = { 
				dark: vscode.Uri.file(`${extensionPath}/assets/img/icons/eye-dark.svg`),
				light: vscode.Uri.file(`${extensionPath}/assets/img/icons/eye-light.svg`)
			}	
			panel.webview.html = getWebviewContent();

      // Set initial content
			refreshView();
			
			// Listen for editor changes
			vscode.workspace.onDidChangeTextDocument(changeEvent => {
				refreshView();
			});
			// Listen for active document changes
			vscode.window.onDidChangeActiveTextEditor(changeEvent => {
				refreshView();
			});
			 
			// Update contents based on view state changes
			panel.onDidChangeViewState(
        e => {
          refreshView();
        },
        null,
        context.subscriptions
      );
	 
			// Dispose/cleanup
			panel.onDidDispose(
        () => {},
        null,
        context.subscriptions
      );
    })
  );
}

//
//
//
function refreshView() {
	var editor = vscode.window.activeTextEditor;
	if(editor) {
		if(editor.document.languageId != "json") {
			//vscode.window.showErrorMessage("Current file is not JSON")
			return;
		}

		// Parse the template JSON
		let templateJSON = editor.document.getText();
    var parser = new ARMParser(templateJSON, extensionPath);    

    // Check for errors
    if(parser.getError()) {
      panel.webview.postMessage({ command: 'error', payload: parser.getError() })
		}	else {
			// Send result as message
			panel.webview.postMessage({ command: 'refresh', payload: parser.getResult() });
		}
	}
};

//
//
//
function getWebviewContent() {	
	const mainScriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'main.js')));
	const mainCss = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'css', 'main.css')));
	const jqueryUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'jquery.min.js')));
	const cyMainUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'cytoscape.min.js')));
	const cySnapUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets', 'js', 'cytoscape-gridsnap.js')));
	const prefix = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'assets')));

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<!--meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline'; script-src * 'unsafe-inline'; style-src * 'unsafe-inline'"-->

		<script src="${jqueryUri}"></script>
		<script src="${cyMainUri}"></script>
		<script src="${cySnapUri}"></script>
		<script src="${mainScriptUri}"></script>

		<link href="${mainCss}" rel="stylesheet" type="text/css">

    <title>ARM Viewer</title>
</head>
<body>
	<div id="error"></div>
	<div id="buttons">
		<button onclick="toggleLabels()">LABELS</button>
		<button onclick="toggleSnap()">SNAP</button>
		<button onclick="cy.fit()">FIT</button>
		<button onclick="reLayout()">LAYOUT</button>
	</div>
	<div id="mainview"></div>

  <div id="infobox">
    <div class="panel-body">
      <table id="infotable">    
      </table>
    </div>
	</div>
	
	<script>	
		window.addEventListener('message', event => {
			document.getElementById('error').style.display = "none"
			document.getElementById('mainview').style.display = "block"
			document.getElementById('buttons').style.display = "block"

			const message = event.data;

			if(message.command == 'refresh') {
				startViewer(message.payload, "${prefix}");
			}

			if(message.command == 'error') {
				document.getElementById('error').innerHTML = message.payload
				document.getElementById('error').style.display = "block"
				document.getElementById('mainview').style.display = "none"
				document.getElementById('buttons').style.display = "none"
			}			
		});
  </script>
</body>
</html>`;
}
