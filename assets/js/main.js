//
// ARM Viewer - VS Code Extension
// Ben Coleman, 2019
// Client script runs inside webview and renders parsed results in a Cytoscape panel
//

// Globals
var cy;                     // Global cytoscape instance
var settingSnap = false;    // Not used currently
var infoShown = false;      // Is infobox displayed
var labelField = 'label';   // Which field to show in labels
var iconPrefix;             // Global prefix string appended to all icons
var vscode;                 // VS Code API instance, can only be fetched once
var filters = "";           // Resource filter string (comma sep list)

//
// Initialize the Cytoscope container, and send message we're done
//
function init(prefix) {
  iconPrefix = prefix
  filters = "";
  hideInfo();  

  // Important step initializes main Cytoscape object 'cy'
  cy = cytoscape({ 
    container: document.getElementById('mainview'),
    wheelSensitivity: 0.15,
    maxZoom: 5,
    minZoom: 0.2,
    selectionType: 'single'
  });

  // Handle deselecting nodes
  cy.on('click tap', evt => {
    // Only sensible way I could find to hide the info box when unselecting
    if(!evt.target.length && infoShown) {
      hideInfo();
    }
  })

  // Handle selection events
  cy.on('select', evt => {
    // Only work with nodes, user can't select edges/arrows
    if(evt.target.isNode()) {

      // Force selection of single nodes only
      if(cy.$('node:selected').length > 1) {
        cy.$('node:selected')[0].unselect();
      }
      
      // The rest of this is just pulling info from the node's data and showing it in a HTML div & table
      document.getElementById('infoimg').setAttribute('src', iconPrefix + '/' + evt.target.data('img'));

      document.getElementById('infotable').innerHTML = ''
      _addInfo('Name', evt.target.data('name'));
      _addInfo('Type', evt.target.data('type'));
      _addInfo('Location', evt.target.data('location'));
      if(evt.target.data('kind')) 
        _addInfo('Kind', evt.target.data('kind'));   

      // Display any extra fields
      if(evt.target.data('extra')) {
        Object.keys(evt.target.data('extra')).forEach(extra => {
          _addInfo(extra, evt.target.data('extra')[extra]);
        })
      }

      // Now display the info box
      if(!infoShown) {
        showInfo()
      }      
    }
  })

  // Send message that we're initialized and ready for data
  vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'initialized' })  
}

//
// Called with new or refreshed data
//
function displayData(data) {
  console.log("### ArmView: Displaying received data");
  //console.dir(JSON.stringify(data, null, 3));
  
  cy.remove('*');
  cy.add(data);

  // Filter out nodes by resource type, if filter is set
  if(filters && filters !== "") {
    filterParts = filters.split(",");
    if(filterParts && filterParts.length > 0) {
      for(let filter of filterParts) {
        filter = filter.trim();
        if(filter !== "") {
          cy.$(`node[type *= "${filter}"]`).remove();
        }
      }
    }
  }

  reLayout('breadthfirst', false);
}

//
// Private method called to update the infobox view
//
function _addInfo(name, value) {
  if(value == 'undefined') return;
  name = name.replace('-', ' ');
  name = decodeURIComponent(name);
  value = decodeURIComponent(value);

  table = document.getElementById('infotable');

  let valClass = '';
  if(value.startsWith('{') && value.endsWith('}'))
    valClass = 'italic';
    
  table.insertAdjacentHTML('beforeend', `<tr><td>${_utilTitleCase(name)}</td><td class='${valClass}'>${value}</td></tr>`);
}

//
// Layout the view of nodes given current data
//
function reLayout(mode, animate) {
  // Set colors in keeping with VS code theme (might be dark or light)
  let bgColor = window.getComputedStyle(document.getElementsByTagName('body')[0]).getPropertyValue('background-color');
  let textColor = '#eeeeee';
  let lineColor = '#fff';
  let borderColor = window.getComputedStyle(document.getElementsByTagName('button')[0]).getPropertyValue('background-color');
  let textColorOutline = bgColor;
  if(document.getElementsByTagName('body')[0].classList.contains("vscode-light")) {
    textColor = '#222222';
    lineColor = '#000';
  } 

  hideInfo();

  // Style of nodes, i.e. resources.
  cy.style().selector('node').style({
    'background-opacity': 0,
    'label': node => { return decodeURIComponent(node.data(labelField)) },
    'background-image': node => { return iconPrefix + '/' + node.data('img') },
    'background-width': '90%',
    'background-height': '90%',
    'shape': 'roundrectangle',
    'width': '128',
    'height': '128',
    'border-width': '0',
    'font-family': '"Segoe UI", Arial, Helvetica, sans-serif',
    'font-size': '15vh',
    'color': textColor,
    'text-valign': 'bottom',
    'text-margin-y': '10vh',
    'font-size': '20%',
    'text-outline-color': textColorOutline,
    'text-outline-width': '4'
  });

  // Bounding box for selected nodes
  cy.style().selector('node:selected').style({
    'border-width': '4',
    'border-color': borderColor
  });

  // Edges are arrows between resources
  cy.style().selector('edge').style({
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    'width': 6,
    'line-color': lineColor,
    'arrow-scale': '1.5',
    'target-arrow-color': lineColor,
    'opacity': 0.3
  });

  // Bounding box for groups
  cy.style().selector(':parent').style({
    'background-image': null,
    'label': node => { return getLabel(node) }, //decodeURIComponent(node.data(labelField)) },
    'border-width': '4',
    'border-color': borderColor,
    'border-opacity': 0.3,
    'background-color': borderColor,
    'background-opacity': 0.1,
    'shape': 'roundrectangle',
    'font-family': '"Segoe UI", Arial, Helvetica, sans-serif',
    'font-size': '15vh',
    'color': textColor,
    'text-valign': 'bottom',
    'text-margin-y': '10vh',
    'font-size': '20%',
    'text-outline-color': textColorOutline,
    'text-outline-width': '4'    
  });

  // Set up snap to grid
  cy.snapToGrid({gridSpacing: 200, lineWidth: 3, drawGrid: false});
  if(settingSnap)
    cy.snapToGrid('snapOn');
  else  
    cy.snapToGrid('snapOff');

  // Re-layout nodes in given mode, resizing and fitting too
  cy.style().update()
  cy.resize();

  if(!mode) mode = 'breadthfirst'
  if(!animate) animate = false
  let spacing = 1.5
  if(mode == 'grid')
    spacing = 1.75

  cy.layout({
    avoidOverlap: true,
    name: mode,
    nodeDimensionsIncludeLabels: false,
    spacingFactor: spacing,
    animate: animate
  }).run();

  cy.fit();
}

//
// Toggle labels from showing resource type to resource name
//
function toggleLabels() {
  labelField = labelField == 'label' ? 'name' : 'label' 
  cy.style().selector('node').style({
    'label': node => { return getLabel(node) } //decodeURIComponent(node.data(labelField)) },
  }).update();
}

//
// Hide the infobox, use CSS transitions, so we slide it hidden to right
//
function hideInfo() {
  let width = document.getElementById("infobox").offsetWidth
  if(!width || width <= 0)
  width = 200; // This is a guess, but only used first time infobox is shown
  width += 20
  document.getElementById('infobox').style.right = `-${width}px`
  infoShown = false;
}

//
// Show the infobox, use CSS transitions, so we slide it into view
//
function showInfo() {
  document.getElementById('infobox').style.right = "10px"
  infoShown = true;
}

//
// Small util function for showing strings in Title Case
//
function _utilTitleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}

//
// Listen for resize events and handle it like a pro
//
window.addEventListener("resize", function() { 
  if(cy) {
    cy.resize();
    cy.fit();
  }
});

//
// Switch snap to grid on or off
//
function toggleSnap() {
  settingSnap = !settingSnap; 
  document.getElementById('statusSnap').innerHTML = settingSnap ? 'On' : 'Off'
  if(settingSnap) {
    document.getElementById('snapbut').classList.add('toggled')
    cy.snapToGrid('snapOn');
    cy.fit();  
  } else {  
    document.getElementById('snapbut').classList.remove('toggled')
    cy.snapToGrid('snapOff');
  }  
}

//
// **** VS Code extension WebView specific functions below here ****
//

// Message handler in webview, messages are sent by extension.ts
window.addEventListener('message', event => {
  // Get message content
  const message = event.data;

  // Parsed data received here from extension.ts refreshView() with results of ARMParser 
  if(message.command == 'newData') {
    document.getElementById('error').style.display = "none"
    document.querySelector('.loader').style.display = "none"
    document.getElementById('mainview').style.display = "block"
    document.getElementById('buttons').style.display = "block"
    document.getElementById('statusbar').style.display = "block"
    
    // Call main display function (above)
    displayData(message.payload);
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

//
// Get label for resource
//
function getLabel(node) {
  let label = decodeURIComponent(node.data(labelField));
  if(label.length > 24) {
    label = label.substr(0, 24) + "…"
  }
  return label;
}

function exportPNG() {
  let data = cy.png({ scale: 2.0, output: 'base64' });  
  vscode.postMessage({ command: "exportPNG", payload: data });
}