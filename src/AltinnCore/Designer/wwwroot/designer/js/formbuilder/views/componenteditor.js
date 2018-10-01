define([
       "jquery",
       "lib/rivets",
       "text!configuration/editorconfig.json",
       "editorelements/editorelements"
], function ($, Rivets, ComponentEditorConfig, EditorElements) {
    var root = this;

    return {
        initialize: function (el, serviceMetadata, resources) {
            self = this;
            root.ComponentEditorConfig = JSON.parse(ComponentEditorConfig);
            root.EditorElements = EditorElements;
            root.serviceMetadata = serviceMetadata;
            root.resources = resources;
            root.currentComponent = $(el);
            var output = $('<div role="tablist" aria-multiselectable="true"></div>');
            self.allProperties = [];
            
            if (root.currentComponent.hasClass('altinngroup')) {
                var groupConfig = root.ComponentEditorConfig["groupconfig"];
                var editorelement = $(root.EditorElements[groupConfig.editortype].view);
                var propertymodel = new root.EditorElements[groupConfig.editortype].model(
                    root.currentComponent,
                    editorelement,
                    groupConfig,
                    serviceMetadata
                );

                Rivets.bind(editorelement, { property: propertymodel });

                self.allProperties.push(propertymodel);

                output.append(editorelement);

            } else {
                var bindingContexts = {};
                function createEditorWindow(el, contexts) {
                    var result = $('<div class="editor-group"></div>');

                    $(el).children('*').each(function (index) {
                        var childElement = this;
                        var tagConfig = root.ComponentEditorConfig["tagconfig"][this.nodeName.toLowerCase()];
                        
                        if (tagConfig) {
                            if ($(childElement).data('editor-show') === true || $(childElement).data('editor-validation') === true) {

                                var bindingContext = $(childElement).data('editor-binding-context');
                                if (bindingContext) {
                                    if (!contexts[bindingContext]) {
                                        contexts[bindingContext] = {
                                            elements: [],
                                            subscribers: []
                                        }
                                    }

                                    contexts[bindingContext].elements.push(childElement);
                                }

                                if ($(childElement).data('editor-show') === true) {
                                    result.append('<h4>' + $(childElement).data('editor-title') + '</h4>');
                                    var validAttributes = tagConfig["attributes"];

                                    $.each(validAttributes, function () {
                                        var editorelement = $(root.EditorElements[this.editortype].view);

                                        var propertyModel = new root.EditorElements[this.editortype].model(
                                            childElement.attributes[this.name],
                                            $(childElement),
                                            editorelement,
                                            this,
                                            serviceMetadata,
                                            resources
                                        );

                                        if (bindingContext) {
                                            contexts[bindingContext].subscribers.push(propertyModel);
                                        }

                                        self.allProperties.push(propertyModel);

                                        Rivets.bind(editorelement, { property: propertyModel });

                                        result.append(editorelement);
                                    });
                                }
                            }
                        } else {
                            result.append(createEditorWindow(this, contexts));
                        }
                    });

                    return result;
                }

                if (!root.resourcesView) {
                    var languages = [];
                    root.resourcesPresentation = [];
                    $.each(Object.keys(root.resources), function () {
                        $.each(Object.keys(root.resources[this]), function () {
                            if ($.inArray(this + '', languages) < 0) {
                                languages.push(this + '');
                            }
                        });

                        root.resourcesPresentation.push({ key: this, value: root.resources[this]});
                    });
                    $.each(root.resourcesPresentation, function () {
                        var resource = this;
                        resource.values = [];
                        $.each(languages, function () {
                            resource.values.push(resource.value[this]);
                        });
                    });

                    root.resourcesView = Rivets.bind($('#resourcesModal'), { languages: languages, resources: root.resourcesPresentation });
                    $("#resourceSearchInput").keyup(function () {
                        var searchTerm = $("#resourceSearchInput").val();
                        var listItem = $('#resourcesTable').children('tr');
                        var searchSplit = searchTerm.replace(/ /g, "'):containsi('")

                        $.extend($.expr[':'], {
                            'containsi': function (elem, i, match, array) {
                                return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
                            }
                        });

                        $("#resourcesTable tr").not(":containsi('" + searchSplit + "')").each(function (e) {
                            $(this).attr('visible', 'false');
                        });

                        $("#resourcesTable tr:containsi('" + searchSplit + "')").each(function (e) {
                            $(this).attr('visible', 'true');
                        });

                        var jobCount = $('#resourcesTable tr[visible="true"]').length;
                        $('.counter').text(jobCount + ' item');

                        if (jobCount === '0') { $('.no-result').show(); }
                        else { $('.no-result').hide();
                        }
                    });
                } 

                var editorWindow = createEditorWindow(root.currentComponent, bindingContexts);

                $.each(bindingContexts, function (index, record) {
                    var editorelement = $(root.EditorElements["elementbinding"].view);

                    var propertyModel = new root.EditorElements["elementbinding"].model(
                        null,
                        record.elements,
                        editorelement,
                        this,
                        serviceMetadata,
                        root.resourcesView.models.resources
                    );

                    self.allProperties.push(propertyModel);
                    Rivets.bind(editorelement, { property: propertyModel });

                    editorWindow.append('<h4>' + $(record.elements[0]).closest('.draggable').data('editor-binding-context-title') + '</h4>');
                    editorWindow.append(editorelement);

                    $.each(record.subscribers, function () {
                        var that = this;
                        propertyModel.on('model-binding-changed', function () {
                            that.onBindingChanged(propertyModel);
                        });
                    });
                });

                output.append(editorWindow);
            }

             return output;
        },

        save: function () {
            $.each(self.allProperties, function () {
                this.save();
            });

            self.allProperties = [];

            $('#componentEditorModal').modal('hide');
        }
    };
});