require.config({
    baseUrl: "/designer/js/formbuilder/"
    , shim: {
        'bootstrap': {
            deps: ['jquery']
        },
        'jqueryui': {
            deps: ['jquery']
        }
    }
    , paths: {
        jquery: "../lib/jquery.min",
        bootstrap: "../lib/bootstrap.bundle.min",
        app: "../formbuilder",
        lib: "../lib",
        text: "../lib/text",
        sightglass: "../lib/index",
        jqueryui: "../lib/jquery-ui/jquery-ui.min",
        vs: "../lib/monaco-editor/vs"
    }
});
require(['app/app'], function (app) {
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

    $("#editorModal .modal-dialog").draggable({
        handle: ".modal-header"
    });
    $('#codeBtn').on('click', function () {
        $('.sidebar').hide();
        $('.sidebar-flexer').hide();
        $('#formRenderedTab').toggle();
        $('#formRawTab').toggle();
        $('#updateFromSource').toggle();
        $('#codeBtn').hide();
        $('#viewBtn').show();
    });
    $('#viewBtn').on('click', function () {
        $('.sidebar').show();
        $('.sidebar-flexer').show();
        $('#formRenderedTab').toggle();
        $('#formRawTab').toggle();
        $('#updateFromSource').toggle();
        $('#viewBtn').hide();
        $('#codeBtn').show();
    });
    app.initialize();
});
