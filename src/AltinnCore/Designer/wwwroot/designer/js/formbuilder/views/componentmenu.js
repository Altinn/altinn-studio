define([
       "jquery",
       "components/components",
       "events",
       "views/renderedform"
], function ($, Components, Events, RenderedForm) {
    var that = this;
    return {
        initialize: function () {
            that = this;

            $.each(Components, function () {
                $("#tabMenu").append("<li class='nav-item'><a class='nav-link' data-toggle='tab' href='#" + this.label + "' role='tab'>" +
                    "<i class='fa fa-fw " + this.icon + "' title='"+ this.label +"' aria-hidden='true'></i><span class='sr-only'>" + this.label + "</span></a></li>");
                var tabContent = $('<div class="tab-pane" id="' + this.label + '" role="tabpanel"></div>');
                $.each(this.controls, function () {
                    tabContent.append(this.src);
                });

                $('#componentTabs').append(tabContent);
            });

            $('#tabMenu .nav-link').first().addClass('active');
            $('#componentTabs .tab-pane').first().addClass('active');

            $(".sidebar .draggable").draggable({
                revert: "invalid",
                appendTo: "body",
                helper: "clone",
                connectWith: "control-target"
            });
        }
    };
});