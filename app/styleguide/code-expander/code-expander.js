/**
 * Class constructor for Code Expander WSK component.
 * Implements WSK component design pattern defined at:
 * https://github.com/jasonmayes/wsk-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialCodeExpander(element) {
  'use strict';

  this.element_ = element;

  // Initialize instance.
  this.init();
}

/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialCodeExpander.prototype.Constant_ = {
  CODE_CONTAINER: null,
  CODE_ELEMENTS_LOADED: [],
  CODE_ELEMENTS_POSITIONS: [],
  CODE_ATTRIBUTE_TAG: 'data-code',
  IS_OPEN: false,
  SCROLL_POSITION: 0,
  SCROLL_POSITION_COOLDOWN: 200,
  SCROLL_POSITION_TIMER: Date.now(),
  SCROLL_SCREEN_PERCENTAGE: 50 // How much scroll tolerance (of total height)
};

/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialCodeExpander.prototype.CssClasses_ = {
  CODE_CONTAINER: 'wsk-code-expander__container',
  CODE_TO_GRAB: 'code-expander',
  ANIMATION_EXPAND: 'expand',
  ANIMATION_EXPANDED: 'expanded',
  IS_UPGRADED: 'is-upgraded'
};

/**
 * Handle mouseup on element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialCodeExpander.prototype.onMouseUp_ = function(event) {
  'use strict';

  console.debug('onMouseUp_', 'Tapped to expand');

  // Binding to a variable so the event can be removed
  var animationFinished = function(e) {
    this.Constant_.CODE_CONTAINER.classList.toggle(
        this.CssClasses_.ANIMATION_EXPANDED);
    e.target.removeEventListener(e.type, animationFinished, true);
  }.bind(this);

  if (this.element_) {
    if (!this.Constant_.IS_OPEN) {
      this.element_.addEventListener('transitionend', animationFinished, true);

      // Add all the code blocks we need to
      this.addCode_();
    } else {
      this.Constant_.CODE_CONTAINER.classList.toggle(
        this.CssClasses_.ANIMATION_EXPANDED);
    }

    this.element_.classList.toggle(this.CssClasses_.ANIMATION_EXPAND);
    this.Constant_.CODE_CONTAINER.
        classList.toggle(this.CssClasses_.ANIMATION_EXPAND);

    this.Constant_.IS_OPEN = !this.Constant_.IS_OPEN;
  }
};

/**
 * Turn opening and closing tags into their HTML entity equivalent.
 * equivalent.
 * @param {String} str The string to be modified.
 * @private
 */
MaterialCodeExpander.prototype.replaceTokens_ = function(str) {
  'use strict';

  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Applies syntax highlighting to a particular element.
 * @param {String} element The string to be highlighted.
 * @private
 */
MaterialCodeExpander.prototype.syntaxHighlight_ = function(element) {
  'use strict';

  Prism.highlightElement(element, false, function() {
    // console.debug('Highlighted');
  });
}

/**
 * Returns current scroll position, relative to the window.
 * @private
 */
MaterialCodeExpander.prototype.getScrollPosition_ = function() {
  'use strict';

  if (window.pageYOffset) {
    return window.pageYOffset;
  }

  return Math.max(document.documentElement.scrollTop, document.body.scrollTop);
}

/**
 * Returns total document height.
 * @private
 */
MaterialCodeExpander.prototype.getDocumentHeight_ = function() {
  'use strict';

  var body = document.body;
  var html = document.documentElement;

  return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight,
                  html.scrollHeight, html.offsetHeight);
}

/**
 * Returns current window height. Works cross-browser.
 * @private
 */
MaterialCodeExpander.prototype.getWindowDimensions_ = function() {
  'use strict';
  var w = window;
  var d = document;
  var e = d.documentElement;
  var g = d.getElementsByTagName('body')[0];
  var x = w.innerWidth || e.clientWidth || g.clientWidth;
  var y = w.innerHeight || e.clientHeight || g.clientHeight;

  return [x, y];
}

/**
 * Creates the code container.
 * @returns {Object}
 * @private
 */
MaterialCodeExpander.prototype.createCodeContainer_ = function() {
  'use strict';

  console.debug('Creating code container');

  var container = document.createElement('div');
  container.classList.add(this.CssClasses_.CODE_CONTAINER);
  container.style.height = this.getDocumentHeight_() + 'px';

  return this.element_.parentElement.insertBefore(container, this.element_);
}

/**
 * Returns all the elements to show code for
 * @returns {Array}
 * @private
 */
MaterialCodeExpander.prototype.getElements_ = function() {
  'use strict';

  var elementsOnPage = document.querySelectorAll('.' +
      this.CssClasses_.CODE_TO_GRAB);
  var elements = [];

  for (var i = 0; i < elementsOnPage.length; i++) {
    var element = elementsOnPage[i];
    elements.push(element);
  };

  return elements;
}

/**
 * Returns the current element to show code for.
 * @param {String} scrollPosition Where currently scrolled.
 * @returns {Array} Elements which we're looking at
 * @private
 */
MaterialCodeExpander.prototype.getElementsInView_ = function() {
  'use strict';

  var elements = [];
  var scrollPosition = this.getScrollPosition_();
  var windowDimensions = this.getWindowDimensions_();
  var scrollTolerance = Math.round(windowDimensions[1] *
                        (this.Constant_.SCROLL_SCREEN_PERCENTAGE / 100));

  // console.debug('Scroll tolerance', windowDimensions[1], scrollTolerance);

  for (var i = 0; i < this.Constant_.CODE_ELEMENTS_POSITIONS.length; i++) {
    var elementPosition = this.Constant_.CODE_ELEMENTS_POSITIONS[i];

    // console.debug('Element', i, elementPosition, scrollPosition);

    // It's possibly in view; includes a tolerance
    if (elementPosition >= scrollPosition - scrollTolerance) {
      // console.debug('Possibly in view');

      var element = document.querySelector(
          '[' + this.Constant_.CODE_ATTRIBUTE_TAG + '=\'' + i + '\']');

      // Add it to the list of elements on screen
      elements.push(element);

      // Check to see if it continues off the screen (if so, this is last one)
      if (elementPosition + element.offsetHeight >
          scrollPosition + windowDimensions[1]) {
        // console.debug('Last element in view');
        break;
      }
    }
  }

  console.debug('Elements in view', elements);

  return elements;
}

/**
 * Add code to the container.
 * @private
 */
MaterialCodeExpander.prototype.addCodeToContainer_ = function(elements) {
  var codeFragments = document.createDocumentFragment();

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];

    var elementIndex = element.getAttribute('data-code');

    if (this.Constant_.CODE_ELEMENTS_LOADED.indexOf(elementIndex) === -1) {
      console.debug('Loading element', elementIndex);

      var preBlock = document.createElement('pre');
      preBlock.className = 'language-markup';
      preBlock.style.top =
          this.Constant_.CODE_ELEMENTS_POSITIONS[elementIndex] + 'px';

      var codeBlock = document.createElement('code');
      codeBlock.className = 'language-markup';

      // Replace opening and closing tags (for syntax highlighting)
      codeBlock.innerHTML = this.replaceTokens_(element.innerHTML);

      preBlock.appendChild(codeBlock);

      // Syntax highlight the code
      this.syntaxHighlight_(codeBlock);

      codeFragments.appendChild(preBlock);

      // Mark this one as added
      this.Constant_.CODE_ELEMENTS_LOADED.push(elementIndex);
    } else {
      console.debug('Already loaded element', elementIndex);
    }
  };

  if (codeFragments.children.length > 0) {
    console.debug('At least one element to add');
    this.Constant_.CODE_CONTAINER.appendChild(codeFragments);
  }
}

/**
 * Add the code container.
 * @param {String} element The string to be modified.
 * @private
 */
MaterialCodeExpander.prototype.addCode_ = function(element) {
  'use strict';

  if (this.Constant_.CODE_ELEMENTS_LOADED.length !==
      this.Constant_.CODE_ELEMENTS_POSITIONS.length) {
    // Get all the current elements in view
    var elements = this.getElementsInView_();

    // Add the code blocks to the page
    this.addCodeToContainer_(elements);
  } else {
    console.debug('Already loaded all the code');
  }
}

/**
 * When the page is scrolled.
 * @param {String} element The string to be modified.
 * @private
 */
MaterialCodeExpander.prototype.onMovedPosition_ = function(element) {
  'use strict';

  console.debug('onMovedPosition', 'Moved position');

  // Get current position
  var scrollPosition = this.getScrollPosition_();

  // Update new position
  this.Constant_.SCROLL_POSITION = scrollPosition;

  // Add code
  this.addCode_();
}

/**
 * Request Animation Frame handler/looper.
 * @private
 */
MaterialCodeExpander.prototype.animFrameHandler_ = function() {
  'use strict';

  // Only care if the code side panel is open
  if (this.Constant_.IS_OPEN) {
    // Scroll position detector
    if (document.body.scrollTop !== this.Constant_.SCROLL_POSITION &&
          Date.now() > (this.Constant_.SCROLL_POSITION_TIMER +
                        this.Constant_.SCROLL_POSITION_COOLDOWN)) {

      this.Constant_.SCROLL_POSITION_TIMER = Date.now();
      this.onMovedPosition_();
    }
  }

  window.requestAnimFrame(this.animFrameHandler_.bind(this));
}

/**
 * Initialize element.
 */
MaterialCodeExpander.prototype.init = function() {
  'use strict';

  if (this.element_) {

    // Create the code container
    this.Constant_.CODE_CONTAINER = this.createCodeContainer_();

    // this.onMouseUp_();

    // Add mouse event to slide in/out
    this.element_.addEventListener('mouseup', this.onMouseUp_.bind(this));

    // Consider this element upgraded
    this.element_.classList.add(this.CssClasses_.IS_UPGRADED);

    // Get all elements we need to be showing
    var elements = this.getElements_();
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      element.setAttribute('data-code', i);
      this.Constant_.CODE_ELEMENTS_POSITIONS.push(element.offsetTop);
    };

    console.debug('Element positions', this.Constant_.CODE_ELEMENTS_POSITIONS);

    console.debug('init', 'Initalised');

    // Kick start request animation frame
    window.requestAnimFrame(this.animFrameHandler_.bind(this));
  }
};

// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialCodeExpander,
  classAsString: 'MaterialCodeExpander',
  cssClass: 'wsk-js-code-expander'
});
