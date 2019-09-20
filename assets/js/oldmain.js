const vscode = acquireVsCodeApi();

window.addEventListener('message', event => {
	const message = event.data;
	console.log(message.command)
	if(message.command == 'refresh') {
		console.log("RRRRRRR")
		console.log(JSON.stringify(message.data[0]))
		document.getElementById('foo').innerHTML = JSON.stringify(message.data[0])
	}
});