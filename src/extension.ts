import * as vscode from 'vscode';

var panel: vscode.WebviewPanel;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('armView.start', () => {
      panel = vscode.window.createWebviewPanel(
        'armViewer',
        'ARM Viewer',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      // Set initial content
			updateWebview();
			
			// Listen for editor changes
			vscode.workspace.onDidChangeTextDocument(changeEvent => {
				var editor = vscode.window.activeTextEditor

				for (const change of changeEvent.contentChanges) {
					if(editor)
						panel.webview.postMessage({ command: 'updatedEditor', content: editor.document.getText() });
				}
	 		});
	 
			// Dispose/cleanup
			panel.onDidDispose(
        () => {},
        null,
        context.subscriptions
      );
    })
  );
}

function updateWebview () {
	panel.webview.html = getWebviewContent();
	var editor = vscode.window.activeTextEditor;
	if(editor)
		panel.webview.postMessage({ command: 'updatedEditor', content: editor.document.getText() });	
};

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
</head>
<body>
		<h1>HELLO</h1>
		<pre id="foo" style="width:100%;height:400px"></pre>
		<script>
		const vscode = acquireVsCodeApi();
		window.addEventListener('message', event => {
			const message = event.data;
			console.log(message)
			if(message.command == 'updatedEditor') {
				document.getElementById('foo').innerHTML = message.content
				
			}
		});
		</script>
</body>
</html>`;
}