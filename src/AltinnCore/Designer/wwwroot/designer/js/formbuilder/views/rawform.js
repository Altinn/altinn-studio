define([
    "jquery",
    "lib/beautify-html",
    "events",
    "vs/loader"
], function ($, Beautify, Events, MonacoLoader) {
    var that = this;
    return {
        initialize: function () {
            $('.main-control-target').bind('DOMNodeInserted DOMNodeRemoved', function () {
                var tempElement = $($(this).clone().wrap('<p>').parent().html());

                var currentSource = Beautify.html_beautify(tempElement.html());
                //alert(currentSource);
                var h = document.body.clientHeight - 100;
                var w = document.body.clientWidth - 50;
                
                require(['vs/editor/editor.main'], function () {
                    if (that.monacoEditor == null) {
                            console.log('Creating editor');
                            that.monacoEditor = monaco.editor.create(document.getElementById("sourceHtml"), {
                                value: currentSource,
                                language: "razor"
                            });
                      
                            that.monacoEditor.layout({height: h, width: w});
                            that.monacoEditor.updateOptions({
                                automaticLayout:false,
                                wrappingColumn:0});
                    }
                    else {
                        that.monacoEditor.setValue(currentSource);
                        that.monacoEditor.layout({height: h, width: w});
                    }
                });
            });

            $('.main-control-target').trigger('DOMNodeInserted');

            $('#updateFromSource').on('click', function () {
                //$('.main-control-target').trigger('DOMNodeInserted');
                //var currentSource = $('#sourceHtml').val();

                $('#formRenderedTab .main-control-target').html(that.monacoEditor.getValue());
                $('#viewBtn').trigger('click');

                //$('.draggable.dropped').on('click', Events.onElementClick);
            });
        }
    };
});
