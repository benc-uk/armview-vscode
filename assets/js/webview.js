//
// ARM Viewer - VS Code Extension
// Ben Coleman, 2019
// Client script works alongside main.js as the interface back to VS Code extension
//

// Message handler in webview, messages are sent by extension.ts
window.addEventListener('message', event => {
  // Get message content
  const message = event.data;

  // Parsed data received here from refreshView() with results of ARMParser 
  if(message.command == 'newData') {
    document.getElementById('error').style.display = "none"
    document.querySelector('.loader').style.display = "none"
    document.getElementById('mainview').style.display = "block"
    document.getElementById('buttons').style.display = "block"
    document.getElementById('statusbar').style.display = "block"
    
    // Call main.js displayData function
    displayData(message.payload, filters);
  }

  // Display error text
  if(message.command == 'error') {
    document.getElementById('errormsg').innerHTML = message.payload
    document.getElementById('error').style.display = "block"
    document.querySelector('.loader').style.display = "none"
    document.getElementById('mainview').style.display = "none"
    document.getElementById('buttons').style.display = "none"
    document.getElementById('statusbar').style.display = "none"
  }		

  // Update the statusbar with applied params file
  if(message.command == 'paramFile') {
    if(message.payload) {
      document.getElementById('statusParams').innerHTML = message.payload
    } else {
      document.getElementById('statusParams').innerHTML = "none"
    }
  }

  // Update the statusbar with applied filters (if any)
  if(message.command == 'filtersApplied') {
    filters = message.payload;
    if(filters == "" && !filters) {
      document.getElementById('statusFilters').innerHTML = "none"
    } else {
      document.getElementById('statusFilters').innerHTML = filters
    }
  }			
  
  // Update the statusbar with the count of objects
  if(message.command == 'resCount') {
    if(message.payload) {
      document.getElementById('statusResCount').innerHTML = message.payload;
    }
  }
});

//
// Used by toolbar buttons to send messages back to extension
//
function sendMessage(msg) {
  try {
    document.getElementById('statusbar').style.display = "none";
    document.getElementById('mainview').style.display = "none";
    document.querySelector('.loader').style.display = "block";
    
    vscode.postMessage({ command: msg });
  } catch(err) {
    console.log(err);
  }
}