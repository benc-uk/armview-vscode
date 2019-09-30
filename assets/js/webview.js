//
// ARM Viewer - VS Code Extension
// Ben Coleman, 2019
// Client script works alongside main.js as the interface back to VS Code extension
//

var filters = "";

// Message handler in webview, messages are sent by extension
window.addEventListener('message', event => {
  const message = event.data;

  // 
  if(message.command == 'refresh') {
    document.getElementById('error').style.display = "none"
    document.querySelector('.loader').style.display = "none"
    document.getElementById('mainview').style.display = "block"
    document.getElementById('buttons').style.display = "block"
    document.getElementById('statusbar').style.display = "block"
    
    // Call main.js displayData function
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

//
// Used by buttons to send messages back to extension
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

// function reload() {
//   try {
//     document.getElementById('buttons').style.display = "block";
//     document.getElementById('error').style.display = "none";
//     document.getElementById('mainview').style.display = "none";
//     document.querySelector('.loader').style.display = "block";
//     vscode.postMessage({ command: 'initialized' });
//   } catch(err) {
//     console.log(err);
//   }
// }		
