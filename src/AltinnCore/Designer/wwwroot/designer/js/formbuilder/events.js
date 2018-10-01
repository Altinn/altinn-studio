define([
       "jquery",
       "lib/rivets",
       "views/componenteditor",
       "data/serviceMetadata",
       "data/resources",
       "views/modeltree"
], function ($, Rivets, ComponentEditor, ServiceMetadataService, ResourcesService, ModelTree) {
    var root = this;
    return {
        initialize: function () {
            var that = this;
            root.ComponentEditor = ComponentEditor;
            root.serviceMetadata = {};
            root.onDrop = that.onDrop;
            root.onDragStart = that.onDragStart;
            root.onDragStop = that.onDragStop;

            ServiceMetadataService.getServiceMetadata(localStorage.getItem("org"), localStorage.getItem("serviceId"), localStorage.getItem("editionId"), function (data) {
                root.serviceMetadata = data;

                ResourcesService.getResources(data.org, data.service, data.edition, function (response) {
                    root.resources = response;
                });

                ModelTree.initialize(data);
            });
        },

        onDragStart: function (event, ui) {
            $('#formRenderedTab').addClass('user-dragging');
        },

        onDragStop: function (event, ui) {
            $('#formRenderedTab').removeClass('user-dragging');
        },

        onDrop: function (event, ui) {
            var $orig = $(ui.draggable);
            $('.draggable.dropped').removeClass('highlight');
            if (!$(ui.draggable).hasClass("dropped")) {
                var $el = $orig
                    .clone()
                    .addClass("dropped")
                    .css({ "position": "", "left": null, "right": null })
                    .appendTo(this);

                $('.droppable').removeClass('highlight');

                $el.find('.droppable').droppable({
                    greedy: true,
                    accept: ".draggable",
                    hoverClass: "droppable-active",
                    drop: root.onDrop,
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
                    start: root.onDragStart,
                    stop: root.onDragStop
                });

                var id = $orig.find(":input").attr("id");

                if (id) {
                    id = id.split("-").slice(0, -1).join("-") + "-"
                        + (parseInt(id.split("-").slice(-1)[0]) + 1);

                    $orig.find(":input").attr("id", id);
                    $orig.find("label").attr("for", id);
                }

                $el.on('click', root.onElementClick);
                $el.css({ "position": "relative", "left": null, "right": null, "width": null });
            } else {
                $('.droppable').removeClass('highlight');
                $orig.css({ "position": "relative", "left": null, "right": null, "width": null }).appendTo(this);
            }

            $('.draggable').css({ "position": "relative" });
        },

        onElementClick: function (event) {
        },

        onSettingsClick: function (event) {
            var componentEditor = root.ComponentEditor;
            var draggable = $(this).closest('.draggable');
            draggable.children('.control-edit-toolbar').remove();
            $('#modalEditBody').html(componentEditor.initialize(draggable, root.serviceMetadata, root.resources));
            $('#editorModal').modal();
            $('#modalSaveBtn').on('click', function () {
                
                componentEditor.save();
                $('#editorModal').modal('hide');
            });
        }
    };
});