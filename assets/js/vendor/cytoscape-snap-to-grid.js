;(function($){ 'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    cytoscape( 'core', 'snapToGrid', function(params){
      var cy = this;
      var fn = params;
      var container = cy.container();
      var defaultParams = {
        stackOrder: -1,
        gridSpacing: 40,
        strokeStyle: '#CCCCCC',
        lineWidth: 1.0,
        lineDash: [5,8],
        zoomDash: true,
        panGrid: true,
        snapToGrid: true,
        drawGrid: true
      };
      
      var functions = {
        //Enables snap-to-grid:
        snapOn: function() {
          var $container = $( this );
          $container.trigger( 'snaptogrid.snapon' );
        },
        
        //Disables snap-to-grid:
        snapOff: function() {
          var $container = $( this );
          $container.trigger( 'snaptogrid.snapoff' );
        },
        
        //Enables the grid drawing:
        gridOn: function() {
          var $container = $( this );
          $container.trigger( 'snaptogrid.gridon' );
        },
        
        //Disables the grid drawing:
        gridOff: function() {
          var $container = $( this );
          $container.trigger( 'snaptogrid.gridoff' );
        },
        
        //Redraws the grid:
        refresh: function() {
          var $container = $( this );
          $container.trigger( 'snaptogrid.refresh' );
        },
      
        //Gets or sets an option:
        option: function( name, value ) {
          var $container = $( this );
          var data = $container.data( 'snapToGrid' );
  
          if( data == null ) {
            return;
          }
  
          var options = data.options;
  
          if( value === undefined ) {
              if( typeof name == typeof {} ) {
              var newOpts = name;
              options = $.extend( true, {}, defaults, newOpts );
              data.options = options;
            } else {
              return options[ name ];
            }
          } else {
            options[ name ] = value;
          }
  
          $container.data( 'snapToGrid', data );
          $container.trigger( 'snaptogrid.refresh' );
  
          return $container;
        },
      
        //Initialization function:
        init: function() {
          var $canvas = $( '<canvas></canvas>' );
          var $container = $( this );
          var ctx;
          
          var opts = $.extend( true, {}, defaultParams, params);
          $container.data( 'snapToGrid', opts );
          
          var optionsCache;
          var options = function() {
            return optionsCache || ( optionsCache = $container.data( 'snapToGrid' ) );
          };
          
          var resizeCanvas = function() {
            $canvas
              .attr( 'height', $container.height() )
              .attr( 'width', $container.width() )
              .css( {
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'z-index': options().stackOrder
              } );
              
          setTimeout( function() {
            var canvasBb = $canvas.offset();
            var containerBb = $container.offset();
            
            $canvas
              .attr( 'height', $container.height() )
              .attr( 'width', $container.width() )
                .css( {
                  'top': -( canvasBb.top - containerBb.top ),
                  'left': -( canvasBb.left - containerBb.left )
                } );
            drawGrid();
          }, 0 );
          };
          
          var drawGrid = function() {
            clearDrawing();
            
            if(!options().drawGrid) {
              return;
            }
            
            var zoom = cy.zoom();
            var canvasWidth = $container.width();
            var canvasHeight = $container.height();
            var increment = options().gridSpacing*zoom;
            var pan = cy.pan();
            var initialValueX = pan.x%increment;
            var initialValueY = pan.y%increment;
            
            ctx.strokeStyle = options().strokeStyle;
            ctx.lineWidth = options().lineWidth;
            
            if(options().zoomDash) {
              var zoomedDash = options().lineDash.slice();
              
              for(var i = 0; i < zoomedDash.length; i++) {
                zoomedDash[ i ] = options().lineDash[ i ]*zoom;
              }
              ctx.setLineDash( zoomedDash );
            } else {
              ctx.setLineDash( options().lineDash );
            }
            
            if(options().panGrid) {
              ctx.lineDashOffset = -pan.y;
            } else {
              ctx.lineDashOffset = 0;
            }
            
            for(var i = initialValueX; i < canvasWidth; i += increment) {
              ctx.beginPath();
                    ctx.moveTo( i, 0 );
                    ctx.lineTo( i, canvasHeight );
                    ctx.stroke();
            }
            
            if(options().panGrid) {
              ctx.lineDashOffset = -pan.x;
            } else {
              ctx.lineDashOffset = 0;
            }
            
            for(var i = initialValueY; i < canvasHeight; i += increment) {
              ctx.beginPath();
                    ctx.moveTo( 0, i );
                    ctx.lineTo( canvasWidth, i );
                    ctx.stroke();
            }
          };
          
          var clearDrawing = function() {
            var width = $container.width();
                var height = $container.height();

                ctx.clearRect( 0, 0, width, height );
          };
          
          var snapNode = function(node) {
            var pos = node.position();
            
            var cellX = Math.floor(pos.x/options().gridSpacing);
            var cellY = Math.floor(pos.y/options().gridSpacing);
            
            node.position( {
              x: (cellX + 0.5)*options().gridSpacing,
              y: (cellY + 0.5)*options().gridSpacing
            } );
          };
          
          var snapAll = function() {
            cy.nodes().each(function(node) {
              snapNode(node);
            });
          };
          
          var nodeFreed = function(ev) {
            if(options().snapToGrid) {
              snapNode(ev.target);
            }
          };
          
          var nodeAdded = function(ev) {
            if(options().snapToGrid) {
              snapNode(ev.target);
            }
          };
          
          var snapOn = function() {
            options().snapToGrid = true;
            snapAll();
          };
          
          var snapOff = function() {
            options().snapToGrid = false;
          };
          
          var gridOn = function() {
            options().drawGrid = true;
            drawGrid();
          };
          
          var gridOff = function() {
            options().drawGrid = false;
            drawGrid();
          };
          
          $container.append( $canvas );
          $( window ).on( 'resize', resizeCanvas );
          $container.on( 'snaptogrid.snapon', snapOn );
          $container.on( 'snaptogrid.snapoff', snapOff );
          $container.on( 'snaptogrid.gridon', gridOn );
          $container.on( 'snaptogrid.gridoff', gridOff );
          $container.on( 'snaptogrid.refresh', resizeCanvas );
          ctx = $canvas[ 0 ].getContext( '2d' );
          
          cy.ready(function() {
            resizeCanvas();
            
            if(options().snapToGrid) {
              snapAll();
            }
            
            cy.on( 'zoom', drawGrid );
            cy.on( 'pan', drawGrid );
            cy.on( 'free', nodeFreed );
            cy.on( 'add', nodeAdded );
          });
        }
      };
      
      if( functions[ fn ] ) {
        return functions[ fn ].apply( container, Array.prototype.slice.call( arguments, 1 ) );
      } else if( typeof fn == 'object' || !fn ) {
        return functions.init.apply( container, arguments );
      } else {
        console.error( 'No such function `' + fn + '` for snapToGrid' );
      }

      return this; // chainability
    } );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-snap-to-grid', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})( typeof jQuery !== 'undefined' ? jQuery : null );
