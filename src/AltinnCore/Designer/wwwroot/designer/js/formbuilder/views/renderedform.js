define([
       "jquery",
       "events",
       "text!editorelements/elementtoolbar.html"
], function ($, Events, ElementToolbar) {
    var that = this;
    return {
        initialize: function () {
            that = this;

            $(".main-control-target .droppable").droppable({
                greedy: true,
                accept: ".draggable",
                helper: "clone",
                hoverClass: "droppable-active",
                drop: Events.onDrop,
                over: function () {
                    $(this).parents('.droppable').addClass('highlight');
                    $(this).addClass('highlight');
                },
                out: function () {
                    $(this).parents('.droppable').removeClass('highlight');
                    $(this).removeClass('highlight');
                }
            }).sortable({
                revert: false,
                connectWith: ".droppable",
                start: Events.onDragStart,
                stop: Events.onDragStop
            });

            $(document).on('mouseover', '.main-control-target .draggable', function (e) {
                var source = this;
                if ($(this).children('.control-edit-toolbar').length > 0) {

                } else {
                    $('.main-control-target .draggable .control-edit-toolbar').remove();
                    var toolbar = $(ElementToolbar);
                    toolbar.children('.settings-btn').on('click', Events.onSettingsClick);
                    $(source).on('dblclick', Events.onSettingsClick);

                    toolbar.children('.delete-btn').on('click', function (ev) {
                        $(source).remove();
                        ev.stopPropagation();
                    });
                    $(this).prepend(toolbar);
                }
                e.stopPropagation();
            });
        }
    };
});
