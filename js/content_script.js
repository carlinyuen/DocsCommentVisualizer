/* Required:
 * js/third_party/jquery-2.1.0.min.js
 * js/constants.js */

$(function()
{
  // Variables & Constants
  var CLASS_KIX_COLLABORATIVE_CURSOR = 'kix-cursor'
    , CLASS_KIX_DOCUMENT_ZOOM = 'kix-zoomdocumentplugin-outer'
    , CLASS_KIX_DOCOS_PRESENCE = 'docos-user-presence'
    , CLASS_KIX_DOCOS_CONTAINER = 'docos-anchoreddocoview'
    , CLASS_KIX_DOCOS_ACTIVE = 'docos-docoview-active'
  	, CLASS_PRESENCE_MARKER = 'dcp-scrollbar-marker'
  	, CLASS_MARKER_REMOVAL = 'dcp-remove-marker'
    , ID_DOCS_HEADER_CONTROLS = 'docs-chrome'
    , PREFIX_ID_DOCO = 'dcp-'
    , PREFIX_ID_MARKER = 'dcp-marker-'
    , INTERVAL_DOCOS_SWEEPER = 200
    , TIME_ANIMATION_SPEED = 200
    , OPACITY_MARKER = 0.33
    , OPACITY_MARKER_ACTIVE = 0.66
    , docosTracker = []
	;

  // Initialize
  init();


  /////////////////////////////////////////
  // FUNCTIONS

	// Custom log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

  // Initialize the extension script
  function init()
  {
    debugLog('Init Docs Collaborative Presence v1.0');

    // Doesn't work -- can't seem to track when inserted
    // $(document).on('DOMNodeInserted', function(e)
    // {
    //   var docos = $(e.target).find("." + CLASS_KIX_DOCOS_CONTAINER);
    //   if (docos.length) {
    //     alert("docos:" + docos.length);
    //   }
    // });

    // Look for docos regularly
    setInterval(sweepDocos, INTERVAL_DOCOS_SWEEPER);
  }

  // Generates unique ID
  function uniqueID() {
    return Math.round(new Date().getTime() * (Math.random() * 100));
  }

  // Search for docos
  function sweepDocos()
  {
    // Fetch docos from document & page properties
    var $docos = $(document).find('div.' + CLASS_KIX_DOCOS_PRESENCE);
    var props = getPageProperties();

    // Store docos into tracker
    $.each($docos, function(index, value)
    {
      var $doco = $(value);
      if (docosTracker.includes(value)) {
        // Do nothing
      } else if ($doco.attr('id')) {
        docosTracker.push(value);   // Shouldn't happen, but doco has been processed before and isn't tracked
      }
      else  // Doco hasn't been tracked
      {
        var ID = uniqueID();
        $doco.attr('id', PREFIX_ID_DOCO + ID);
        var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
        drawDocoMarker(
          calculateMarkerProperties(
            $container.css('top').replace("px", ""),
            $container.outerHeight(),
            props
          )
          , $doco.css('background-color')
          , PREFIX_ID_MARKER + ID);
        docosTracker.push(value);
      }
    });

    // Need to get rid of removed docos
    docosTracker = $.grep(docosTracker, function(value)
    {
      var id = $(value).attr('id');
      if ($('body').find('#' + id).length <= 0)
      {
        // debugLog('remove:', value);
        removeDocoMarker(PREFIX_ID_MARKER + id.substr(PREFIX_ID_DOCO.length));
        return false;
      }
      return true;
    });

    redrawDocoMarkers(props);
  }

  // Draw doco indicators
  function redrawDocoMarkers(props)
  {
    if (!props) {
      props = getPageProperties();
    }

    // Iterate through docos and redraw
    $.each(docosTracker, function(index, value)
    {
      // Setup
      var $doco = $(value);
      var id = $doco.attr('id');
      var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);

      // Calculate position
      var markerProps = calculateMarkerProperties(
        $container.css('top').replace("px", ""),
        $container.outerHeight(),
        props
      );
      // Mark as active if doco is active
      markerProps.active = ($container.hasClass(CLASS_KIX_DOCOS_ACTIVE));

      // Redraw the marker
      drawDocoMarker(
        markerProps,
        $doco.css('background-color'),
        PREFIX_ID_MARKER + id.substr(PREFIX_ID_DOCO.length)
      );
    });
  }

  // Creates a doco indicator, returns jQuery object
  function createDocoMarker(id)
  {
    var $marker = $(document.createElement('div')).addClass(CLASS_PRESENCE_MARKER);
    if (id) {
      $marker.attr('id', id);
    }
    return $marker;
  }

  // Get page properties for positioning calculations
  function getPageProperties()
  {
    var headerHeight = $('#' + ID_DOCS_HEADER_CONTROLS).height();
    var pageHeight = $('body').height();
    return {
      documentHeight: $('div.' + CLASS_KIX_DOCUMENT_ZOOM).height(),
      headerHeight: headerHeight,
      pageHeight: pageHeight,
      scrollbarHeight: pageHeight - headerHeight,
    };
  }

  // Calculate positioning for doco indicator based off page properties
  function calculateMarkerProperties(top, height, pageProperties)
  {
    if (!pageProperties) {
      pageProperties = getPageProperties();
    }
    return {
      top: ((pageProperties.headerHeight / pageProperties.pageHeight) * 100)   // Account for chrome
        + (((top / pageProperties.documentHeight)
              * pageProperties.scrollbarHeight)
              / pageProperties.pageHeight * 100) + '%',
      height: (((height / pageProperties.documentHeight)
                  * pageProperties.scrollbarHeight)
                  / pageProperties.pageHeight * 100) + '%',
    };
  }

  // Draw a single doco indicator
  function drawDocoMarker(properties, color, id)
  {
    // debugLog("drawDocoMarker:", properties, color, id);

    // Create marker
    var $marker, newlyCreated = false;
    if (id) {
      $marker = $('body').find('#' + id);
    }
    if ($marker.length <= 0)
    {
      $marker = createDocoMarker(id);
      newlyCreated = true;
    }
    else if ($marker.hasClass(CLASS_MARKER_REMOVAL)) {
      return;   // Marked for removal, do not disturb
    }

    // Calculate vertical position
    var css = {   // Set position and height relative to page
      top: properties.top,
      height: properties.height,
      opacity: (properties.active
        ? OPACITY_MARKER_ACTIVE : OPACITY_MARKER),
    };
    // debugLog("css:", css);

    // Add to document if newly created
    if (newlyCreated)
    {
      css.background = color;  // Copy node color style
      $marker.css(css);
      $('body').append($marker).slideDown(TIME_ANIMATION_SPEED);
    }
    else {  // Otherwise only animate height changes
      $marker.stop(true).animate(css, TIME_ANIMATION_SPEED);
    }
  }

  // Clear all doco indicators
  function clearDocoMarkers()
  {
    $('.' + CLASS_PRESENCE_MARKER)
      .addClass(CLASS_MARKER_REMOVAL)
      .slideUp('fast', function(e) {
        $(this).remove();
      });
  }

  // Remove a single doco indicator
  function removeDocoMarker(id)
  {
    $('#' + id)
      .addClass(CLASS_MARKER_REMOVAL)
      .slideUp('fast', function(e) {
        $(this).remove();
      });
  }

});
