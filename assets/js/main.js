// Globals
var cy;
var settingSnap = false;
var infoShown = false;
var labelField = 'label';
var iconPrefix

window.addEventListener("resize", function() {
  cy.resize();
  cy.fit();
});

function startViewer(elements, prefix) {
  $('#infobox').hide();
  $('#mainview').show();

  iconPrefix = prefix
  
  cy = cytoscape({ 
    container: $('#mainview'),
    wheelSensitivity: 0.15,
    maxZoom: 5,
    minZoom: 0.2,
    selectionType: 'single'
  });

  cy.on('click tap', evt => {
    // Only sensible way I could find to hide the info box when unselecting
    if(!evt.target.length && infoShown) {
      $('#infobox').toggle("slide")
      infoShown = false;
    }
  })

  // Handle selection events
  cy.on('select', evt => {
    // Only work with nodes
    if(evt.target.isNode()) {

      // Force selection of single nodes only
      if(cy.$('node:selected').length > 1) {
        cy.$('node:selected')[0].unselect();
      }
      
      // The rest of this is just pulling info from the node's data and showing it in a HTML div & table
      $('#infoimg').attr('src', evt.target.data('img'));

      $('#infotable').html('');
      addInfo('Name', evt.target.data('name'));
      addInfo('Type', evt.target.data('type'));
      addInfo('Location', evt.target.data('location'));
      if(evt.target.data('kind')) 
        addInfo('Kind', evt.target.data('kind'));   

      // Display any extra fields
      if(evt.target.data('extra')) {
        Object.keys(evt.target.data('extra')).forEach(extra => {
          addInfo(extra, evt.target.data('extra')[extra]);
        })
      }

      // Now display the info box
      if(!infoShown) {
        $('#infobox').toggle("slide")
        infoShown = true;
      }      
    }
  })

  // Important part! load the elements (nodes) to the view
  cy.add(elements);
  reLayout();
}

function addInfo(name, value) {
  if(value == 'undefined') return;
  name = name.replace('-', ' ');
  name = decodeURIComponent(name);
  value = decodeURIComponent(value);

  if(value.startsWith('http'))
    $('#infotable').append(`<tr><td>${titleCase(name)}</td><td><a href='/view?url=${encodeURIComponent(value)}' target='_blank'>${value}</a></td></tr>`)
  else
    $('#infotable').append(`<tr><td>${titleCase(name)}</td><td>${value}</td></tr>`)
}

function reLayout() {
  let bgColor = $('body').css('background-color');
  let textColor = '#eeeeee';
  let lineColor = '#666666';
  let borderColor = $('button').css('background-color');
  let textColorOutline = bgColor;
  if($('body').hasClass("vscode-light")) {
    textColor = '#222222';
    lineColor = '#cccccc';
  } 

  cy.style().selector('node').style({
    'background-opacity': 0,
    'label': function( ele ){ return decodeURIComponent(ele.data(labelField)) },
    'background-image': function( ele ){ return iconPrefix + ele.data('img') },
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

  cy.style().selector('node:selected').style({
    'border-width': '4',
    'border-color': borderColor
  });

  cy.style().selector('edge').style({
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    'width': 6,
    'line-color': lineColor,
    'arrow-scale': '1.5',
    'target-arrow-color': lineColor
  });

  cy.snapToGrid({gridSpacing: 200, lineWidth: 3, drawGrid: false});
  if(settingSnap)
    cy.snapToGrid('snapOn');
  else  
    cy.snapToGrid('snapOff');

  cy.style().update()
  cy.resize();
  cy.layout({name: 'breadthfirst'}).run();
  cy.fit();
}

function toggleSnap() {
  settingSnap = !settingSnap; 
  if(settingSnap) {
    cy.snapToGrid('snapOn');
    cy.fit();
    $('#snapBut').removeClass('btn-primary')
    $('#snapBut').addClass('btn-info')    
  } else {  
    cy.snapToGrid('snapOff');
    $('#snapBut').removeClass('btn-info')
    $('#snapBut').addClass('btn-primary')    
  }  
}

function toggleLabels() {
  labelField = labelField == 'label' ? 'name' : 'label' 
  cy.style().selector('node').style({
    'label': function( ele ){ return decodeURIComponent(ele.data(labelField)) },
  }).update();
}

function titleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}

function hideInfo() {
  $('#infobox').toggle('slide'); 
  infoShown = false;
}