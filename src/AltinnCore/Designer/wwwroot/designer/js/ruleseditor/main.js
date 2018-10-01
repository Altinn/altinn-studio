require.config({
    baseUrl: "/designer/js/ruleseditor/"
    , shim: {
        'bootstrap': {
            deps: ['jquery']
        },
        'jqueryui': {
            deps: ['jquery']
        },
        'modelautocomplete': {
            deps: ['jqueryui']
        }
    }
    , paths: {
        bootstrap: "../lib/bootstrap.bundle.min",
        jquery: "../lib/jquery.min",
        app: "../ruleseditor",
        lib: "../lib",
        text: "../lib/text",
        sightglass: "../lib/index",
        jqueryui: "../lib/jquery-ui/jquery-ui.min",
        modelautocomplete: "../jqueryextensions/servicemodelautocomplete"
    }
    , packages: [],
});
require(['app/app'], function (app) {
    console.log('test');
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            position = position || 0;
            return this.indexOf(searchString, position) === position;
        };
    }

    if (!String.prototype.regexIndexOf) {
        String.prototype.regexIndexOf = function (regex, startpos) {
            var indexOf = this.substring(startpos || 0).search(regex);
            return indexOf >= 0 ? indexOf + (startpos || 0) : indexOf;
        };
    }
    
    app.initialize();
});
