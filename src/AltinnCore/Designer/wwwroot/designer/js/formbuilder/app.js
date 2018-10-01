define([
       "jquery",
       "bootstrap",
       "lib/beautify-html",
       "jqueryui",
       "views/componentmenu",
       "views/renderedform",
       "views/rawform",
       "events",
       "data/formbuilder"
], function ($, bootstrap, beautify, ui, ComponentMenu, RenderedForm, RawForm, Events, FormBuilderService) {
    var that = this;
    return {
        initialize: function () {
            that = this;

            var getUrlParameter = function getUrlParameter(sParam) {
                var sPageURL = decodeURIComponent(window.location.search.substring(1)),
                    sURLVariables = sPageURL.split('&'),
                    sParameterName,
                    i;

                for (i = 0; i < sURLVariables.length; i++) {
                    sParameterName = sURLVariables[i].split('=');

                    if (sParameterName[0] === sParam) {
                        return sParameterName[1] === undefined ? true : sParameterName[1];
                    }
                }
            };

            that.org = window.location.pathname.split('/')[2];
            that.serviceId = window.location.pathname.split('/')[3];
            that.editionId = window.location.pathname.split('/')[4];
            that.viewName = window.location.pathname.split('/')[7];

            localStorage.setItem("org", that.org);
            localStorage.setItem("serviceId", that.serviceId);
            localStorage.setItem("editionId", that.editionId);
            
            ComponentMenu.initialize();
            RenderedForm.initialize();     
            Events.initialize();

            $('.main-control-target .draggable').each(function () {
                var $el = $(this);
                $el.attr('style', '');
            });

            $('#saveFormBtn').on('click', function () {
                var mainForm = $('.main-control-target').clone();
                FormBuilderService.saveView(that.org, that.serviceId, that.editionId, that.viewName, mainForm.html());
            });

            $('.draggable.dropped').on('click', Events.onElementClick);

            $('#mainContainer').show();
            $('#loadingContainer').hide();
            
            //Must be last to be able to calculate height
            RawForm.initialize();
        }
    };
});
