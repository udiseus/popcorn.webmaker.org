/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/time" ],
  function( util ) {

  var SCROLL_INTERVAL = 16,
      SCROLL_DISTANCE = 20,
      MOUSE_SCRUBBER_PIXEL_WINDOW = 3;

  return function( butter, parentElement, media, tracksContainer ) {
    var _container = parentElement.querySelector( ".time-bar-scrubber-container" ),
        _node = _container.querySelector( ".time-bar-scrubber-node" ),
        _timeTooltip = _container.querySelector( ".butter-time-tooltip" ),
        _line = _container.querySelector( ".time-bar-scrubber-line" ),
        _fill = _container.querySelector( ".fill-bar" ),
        _tracksContainer = tracksContainer,
        _tracksContainerWidth,
        _media = media,
        _mouseDownPos,
        _currentMousePos,
        _timelineMousePos,
        _scrollInterval = -1,
        _rect,
        _width = 0,
        _isPlaying = false,
        _isScrubbing = false,
        _lastTime = -1,
        _lastScrollLeft = _tracksContainer.element.scrollLeft,
        _lastScrollWidth = _tracksContainer.element.scrollWidth,
        _lineWidth = 0,
        _isSeeking = false,
        _seekMouseUp = false;

    function setNodePosition() {
      var duration = _media.duration,
          currentTime = _media.currentTime,
          tracksElement = _tracksContainer.element,
          scrollLeft = tracksElement.scrollLeft,
          scrollWidth = tracksElement.scrollWidth;

      // If we can avoid re-setting position and visibility, then do so
      if( _lastTime !== currentTime || _lastScrollLeft !== scrollLeft || _lastScrollWidth !== scrollWidth ){
        setTimeTooltip();

        // To prevent some scrubber jittering (from viewport centering), pos is rounded before
        // being used in calculation to account for possible precision issues.
        var pos = Math.round( currentTime / duration * _tracksContainerWidth ),
            adjustedPos = pos - scrollLeft;

        // If the node position is outside of the viewing window, hide it.
        // Otherwise, show it and adjust its position.
        // Note the use of clientWidth here to account for padding/margin width fuzziness.
        if( pos < scrollLeft || pos - _lineWidth > _container.clientWidth + scrollLeft ){
          _node.style.display = "none";
          _line.style.display = "none";
        }
        else {
          _node.style.left = adjustedPos + "px";
          _node.style.display = "block";
          _line.style.left = adjustedPos + "px";
          _line.style.display = "block";
        } //if

        if( pos < scrollLeft ){
          _fill.style.display = "none";
        }
        else {
          if( pos > _width + scrollLeft ){
            _fill.style.width = ( _width - 2 ) + "px";
          }
          else {
            _fill.style.width = adjustedPos + "px";
          } //if
          _fill.style.display = "block";
        } //if
      } //if

      _lastTime = currentTime;
      _lastScrollLeft = scrollLeft;
      _lastScrollWidth = scrollWidth;
    }

    function onMouseUp() {
      _seekMouseUp = true;

      _timeTooltip.classList.remove( "tooltip-no-transition-on" );

      if( _isPlaying && !_isSeeking ){
        _media.play();
      }

      if( _isScrubbing ){
        _isScrubbing = false;
      }

      clearInterval( _scrollInterval );
      _scrollInterval = -1;

      parentElement.addEventListener( "mouseover", onMouseOver, false );
      window.removeEventListener( "mouseup", onMouseUp, false );
      window.removeEventListener( "mousemove", onMouseMove, false );
    } //onMouseUp

    function scrollTracksContainer( direction ) {
      if( direction === "right" ){
        _scrollInterval = setInterval(function() {
          if( _currentMousePos < _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos += SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft += SCROLL_DISTANCE;
            evalMousePosition();
            setNodePosition();
          }
        }, SCROLL_INTERVAL );
      }
      else{
        _scrollInterval = setInterval(function() {
          if( _currentMousePos > _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos -= SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft -= SCROLL_DISTANCE;
            evalMousePosition();
            setNodePosition();
          }
        }, SCROLL_INTERVAL );
      }
    } //scrollTracksContainer

    function evalMousePosition() {
      var diff = _currentMousePos - _mouseDownPos;
      diff = Math.max( 0, Math.min( diff, _width ) );
      _media.currentTime = ( diff + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
    } //evalMousePosition

    function onMouseMove( e ) {
      _currentMousePos = e.pageX;

      if( _scrollInterval === -1 ){
        if( _currentMousePos > _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "right" );
        }
        else if( _currentMousePos < _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "left" );
        } //if
      } //if

      onTimelineMouseMove( e );
      evalMousePosition();
      setNodePosition();
    } //onMouseMove

    function onSeeked() {
      _isSeeking = false;

      _media.unlisten( "mediaseeked", onSeeked );

      if( _isPlaying && _seekMouseUp ) {
        _media.play();
      }
    }

    function onTimelineMouseMove( e ) {
      var butterTrayOffSet = document.querySelector(".butter-tray").offsetLeft;

      if(document.querySelector( "html" ).dir === "rtl") {
        _timelineMousePos =  e.clientX - (parentElement.offsetLeft + butterTrayOffSet);
      } else {
        _timelineMousePos = e.clientX - parentElement.offsetLeft;
      }

      if ( _timelineMousePos < 0 ) {
        _timelineMousePos = 0;
      } else if ( _timelineMousePos > _container.offsetWidth ) {
        _timelineMousePos = _container.offsetWidth;
      }

      _timeTooltip.style.left = _timelineMousePos + "px";
      setTimeTooltip();
    }

    function setTimeTooltip() {
      _timeTooltip.innerHTML = util.toTimecode( ( _timelineMousePos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration, 0 );
    }

    function onMouseOver( e ) {
      onTimelineMouseMove( e );
      _timeTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.addEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseover", onMouseOver, false );
      parentElement.addEventListener( "mouseout", onMouseOut, false );
    }

    function onMouseOut() {
      _timeTooltip.classList.remove( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.addEventListener( "mouseover", onMouseOver, false );
    }

    var onMouseDown = this.onMouseDown = function( e ) {
      var pos = e.pageX - _container.getBoundingClientRect().left;
      // Stop text selection in chrome.
      e.preventDefault();

      _isScrubbing = true;
      _isSeeking = true;
      _seekMouseUp = false;
      _media.listen( "mediaseeked", onSeeked );

      if( _isPlaying ){
        _media.pause();
      }

      _media.currentTime = ( pos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
      setNodePosition();
      _mouseDownPos = e.pageX - _node.offsetLeft;

      if ( _media.currentTime >= 0 ) {
        _timeTooltip.innerHTML = util.toTimecode( _media.currentTime, 0 );
      }
      _timeTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      window.addEventListener( "mousemove", onMouseMove, false );
      window.addEventListener( "mouseup", onMouseUp, false );
    }; //onMouseDown

    parentElement.addEventListener( "mouseover", onMouseOver, false );

    this.update = function( containerWidth ) {
      _width = containerWidth || _width;
      _tracksContainerWidth = _tracksContainer.container.getBoundingClientRect().width;
      _rect = _container.getBoundingClientRect();
      _lineWidth = _line.clientWidth;
      setNodePosition();
    };

    this.ready = function() {
      _container.addEventListener( "mousedown", onMouseDown, false );
    };


    _media.listen( "mediaplay", function() {
      _isPlaying = true;
    });

    _media.listen( "mediapause", function() {
      // scrubbing is for the mouseup and mousedown state.
      // seeking is the media's state.
      // these are not always the same.
      if( !_isScrubbing && !_isSeeking ){
        _isPlaying = false;
      }
    });

    _media.listen( "mediatimeupdate", setNodePosition );
  };
});
