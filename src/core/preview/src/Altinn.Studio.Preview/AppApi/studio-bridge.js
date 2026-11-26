// The Studio bridge, which preview adds to each page before the app frontend. Studio, the page that frames preview,
// tells it when the app's layouts or texts change, and it has the frontend show them without reloading the page, which
// would lose the developer's place in the form. On a v9 app's page, whose script has data-component-errors, it also
// tells Studio which components the app frontend found errors in, so the editor can show the errors by the components.
//
// It needs nothing new from the app frontend, so it works with each published version:
// - The v9 frontend validates the layout when window.forceLayoutPropertiesValidation is 'on'. It does so only on hosts
//   it knows as Studio's or a test environment's otherwise, and preview's domain is neither.
// - The v9 frontend logs through window.logError and window.logErrorOnce, and keeps the functions a page defined before
//   it. Each error in a component's configuration is logged with the component's ID.
// - The frontend sets window.queryClient. The v9 frontend keeps the layouts in the formBootstrap queries and the texts
//   in the textResources queries, which take the texts in the page's language from window.altinnAppGlobalData. The v8
//   frontend keeps them in the formLayouts and fetchTextResources queries, and the page settings in layoutSettings.
//   When the frontend has none of the queries a change needs, the bridge reloads the page.
//
// It catches its own errors, so preview works as before when it fails, and Studio shows no errors. Studio treats each
// message as untrusted, since the app's own scripts run on this page too and can send the same messages.
(function () {
  'use strict';

  var SOURCE = 'altinn-studio-preview';
  var STUDIO_SOURCE = 'altinn-studio';
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
    var reportsErrors = script.hasAttribute('data-component-errors');

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
      if (
        arg &&
        typeof arg === 'object' &&
        typeof arg.name === 'string' &&
        typeof arg.message === 'string'
      ) {
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
          message =
            message.charAt(message.length - 1) === '\n' ? message + part : message + ' ' + part;
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

    if (reportsErrors) {
      if (window.forceLayoutPropertiesValidation === undefined) {
        window.forceLayoutPropertiesValidation = 'on';
      }
      if (typeof window.logError !== 'function') {
        window.logError = logFunction(false);
      }
      if (typeof window.logErrorOnce !== 'function') {
        window.logErrorOnce = logFunction(true);
      }
    }

    var reload = function () {
      try {
        window.location.reload();
      } catch (e) {
        // Preview works without the bridge.
      }
    };

    // Fetches the first of the queries that the frontend has again, as the frontends name them differently.
    var refetch = function (queryKeys) {
      var client = window.queryClient;
      for (var i = 0; client && i < queryKeys.length; i++) {
        if (client.getQueryCache().findAll({ queryKey: queryKeys[i] }).length > 0) {
          return client.invalidateQueries({ queryKey: queryKeys[i] });
        }
      }
      reload();
    };

    // A later change fetches the texts again, so only the latest answer counts.
    var textsRequest = 0;

    var refetchTexts = function () {
      var texts = window.altinnAppGlobalData && window.altinnAppGlobalData.textResources;
      if (!texts) {
        return refetch([['textResources'], ['fetchTextResources']]);
      }
      var request = ++textsRequest;
      return fetch(
        '/' + window.org + '/' + window.app + '/api/v1/texts/' + encodeURIComponent(texts.language),
      )
        .then(function (response) {
          if (!response.ok) {
            throw new Error('The texts answered ' + response.status);
          }
          return response.json();
        })
        .then(function (fresh) {
          if (request !== textsRequest) {
            return;
          }
          texts.resources = fresh.resources;
          return refetch([['textResources']]);
        });
    };

    // The frontend validates the layouts it gets again and logs what is still wrong, so the errors start over.
    var forgetErrors = function () {
      if (!reportsErrors) {
        return;
      }
      errors = Object.create(null);
      componentCount = 0;
      logged = Object.create(null);
      loggedCount = 0;
      send();
    };

    var changes = {
      layoutsChanged: function () {
        forgetErrors();
        return refetch([['formBootstrap'], ['formLayouts']]);
      },
      layoutSettingsChanged: function () {
        return refetch([['layoutSettings']]);
      },
      textsChanged: refetchTexts,
    };

    // The app's own scripts and other pages can post to this window too, so only Studio's page that frames it counts.
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (
        event.source !== window.parent ||
        event.origin !== studioOrigin ||
        !data ||
        data.source !== STUDIO_SOURCE ||
        data.version !== VERSION ||
        !Object.prototype.hasOwnProperty.call(changes, data.type)
      ) {
        return;
      }
      try {
        Promise.resolve(changes[data.type]()).catch(reload);
      } catch (e) {
        reload();
      }
    });

    // Studio forgets the errors of the page before, and sends changes from now on.
    post({ type: 'ready' });
  } catch (e) {
    // Preview works without the bridge.
  }
})();
