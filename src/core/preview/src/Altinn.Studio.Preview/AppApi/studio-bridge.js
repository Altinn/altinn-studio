// The Studio bridge, which preview adds to each page before the app frontend. It tells Studio, the page that frames
// preview, which components the app frontend found errors in, so the editors can show the errors by the components.
//
// It needs nothing new from the app frontend, so it works with each published version:
// - The frontend validates the layout when window.forceLayoutPropertiesValidation is 'on'. It does so only on hosts it
//   knows as Studio's or a test environment's otherwise, and preview's domain is neither.
// - The frontend logs through window.logError and window.logErrorOnce, and keeps the functions a page defined before
//   it. Each error in a component's configuration is logged with the component's ID.
//
// It catches its own errors, so preview works as before when it fails, and Studio shows no errors. Studio treats each
// message as untrusted, since the app's own scripts run on this page too and can send the same messages.
(function () {
  'use strict';

  var SOURCE = 'altinn-studio-preview';
  var VERSION = 1;
  var MAX_COMPONENTS = 200;
  var MAX_ERRORS = 20;
  var MAX_LENGTH = 1000;
  var MAX_LOGGED = 2000;
  var SEND_DELAY_MS = 250;

  // How the app frontend logs an error in a component, from its first v9 version on. The first group is the
  // component's ID, and the second the error, where the message has one.
  var PATTERNS = [
    /^(?:Layout configuration errors|Data model binding errors|Unknown component type) for component '\/([^']+)':\n- ([\s\S]+)$/,
    /^Validation error for '([^']+)': ([\s\S]+)$/,
    /^Exception thrown when rendering node "([^"]+)":\n?([\s\S]+)$/,
    /^No component definition found for type '[^']*' \(component '([^']+)'\)$/,
  ];

  try {
    var script = document.currentScript;
    var studioOrigin = script && script.getAttribute('data-studio-origin');
    if (!studioOrigin || window.parent === window) {
      return;
    }

    var errors = Object.create(null);
    var componentCount = 0;
    var logged = Object.create(null);
    var loggedCount = 0;
    var sendTimer = null;

    var post = function (message) {
      message.source = SOURCE;
      message.version = VERSION;
      try {
        window.parent.postMessage(message, studioOrigin);
      } catch (e) {
        // Preview works without the bridge.
      }
    };

    // The message as the app frontend joins a log call's arguments.
    var describe = function (arg) {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg && typeof arg === 'object' && typeof arg.name === 'string' && typeof arg.message === 'string') {
        return arg.name + ': ' + arg.message;
      }
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e) {
        return String(arg);
      }
    };
    var join = function (args) {
      var message = '';
      for (var i = 0; i < args.length; i++) {
        var part = describe(args[i]);
        if (message.length === 0) {
          message = part;
        } else if (part.length > 0) {
          message = message.charAt(message.length - 1) === '\n' ? message + part : message + ' ' + part;
        }
      }
      return message;
    };

    var send = function () {
      sendTimer = null;
      post({ type: 'componentErrors', errors: errors });
    };

    var record = function (message) {
      for (var i = 0; i < PATTERNS.length; i++) {
        var match = PATTERNS[i].exec(message);
        if (!match) {
          continue;
        }
        var componentId = match[1];
        var error = (match[2] || message).slice(0, MAX_LENGTH);
        var componentErrors = errors[componentId];
        if (!componentErrors) {
          if (componentCount >= MAX_COMPONENTS) {
            return;
          }
          componentErrors = errors[componentId] = [];
          componentCount++;
        }
        if (componentErrors.length < MAX_ERRORS && componentErrors.indexOf(error) === -1) {
          componentErrors.push(error);
          sendTimer = sendTimer || setTimeout(send, SEND_DELAY_MS);
        }
        return;
      }
    };

    // A log function as the app frontend's: the Once variant logs each message once. It also writes to the console,
    // where a developer looks, since the app frontend shows its logs only in its developer tools.
    var logFunction = function (once) {
      return function () {
        var args = arguments;
        try {
          var message = join(args);
          if (once) {
            if (logged[message]) {
              return;
            }
            if (loggedCount < MAX_LOGGED) {
              logged[message] = true;
              loggedCount++;
            }
          }
          record(message);
        } catch (e) {
          // Preview works without the bridge.
        }
        try {
          console.error.apply(console, args);
        } catch (e) {
          // Nor does it need the console.
        }
      };
    };

    if (window.forceLayoutPropertiesValidation === undefined) {
      window.forceLayoutPropertiesValidation = 'on';
    }
    if (typeof window.logError !== 'function') {
      window.logError = logFunction(false);
    }
    if (typeof window.logErrorOnce !== 'function') {
      window.logErrorOnce = logFunction(true);
    }

    // Studio forgets the errors of the page before.
    post({ type: 'ready' });
  } catch (e) {
    // Preview works without the bridge.
  }
})();
