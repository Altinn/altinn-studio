define(function () {
    "use strict";

    function Model(el, srcElements, self, elementConfig, serviceMetadata) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;

        // Load current value and set label content
        root.value = $(srcElements[0]).attr('altinn-for');
        root.name = elementConfig.name;

        // Populate model properties
        root.serviceMetadata = serviceMetadata;
        root.self = self;
        root.elementConfig = elementConfig;
        root.elements = srcElements;

        $('#treeViewBtns').hide();
        $('#configurationBtns').show();
        $('#modalEditTreeView').hide();
        $('#modalEditBody').show();

        root.parents = $(root.elements[0]).parents('[altinn-group-binding]');
        root.parentsReversed = [];
        root.parents.each(function(index, e) {
            root.parentsReversed.push(e);
        });

        root.parentsReversed = root.parentsReversed.reverse();
        var setGroupProperties = function (elements) {
            root.parent = $(elements[0]).closest('[altinn-group-binding]');
            if (root.parent.length !== 0) {
                root.hasParent = true;

                root.parentGroupName = root.parent.attr('altinn-group-name');
                root.parentGroupBinding = root.parent.attr('altinn-group-binding');
                root.parentGroupIndexName = root.parent.attr('altinn-group-index-name');
            }
        }

        // Find direct parent group and config (if there is any)
        setGroupProperties(srcElements);

        // Filter the model elements based on context
        var validElements = [];
        var metadataKeys = Object.keys(root.serviceMetadata.elements);
        $.each(root.serviceMetadata.elements, function (index, rootValue) {
            var parts = rootValue.id.split('.');

            if (root.parentsReversed.length === 0
                || rootValue.id.startsWith($(root.parentsReversed[root.parentsReversed.length - 1]).attr('altinn-group-binding'))
                || $(root.parentsReversed[root.parentsReversed.length - 1]).attr('altinn-group-binding').startsWith(rootValue.id)) {
                var tempPath = parts[0];
                var disabled = false;
                var parentIndex = 0;
                for (var i = 1; i < parts.length; i++) {
                    tempPath = tempPath + '.' + parts[i];

                    var value = root.serviceMetadata.elements[tempPath];

                    if (value.type === 'Group'
                            && value.maxOccurs > 1
                            && value.id === tempPath) {
                        if ($(root.parentsReversed[parentIndex]).attr('altinn-group-binding') !== value.id) {
                            disabled = true;
                        } else {
                            if (!rootValue.indexedNames) {
                                rootValue.indexedNames = [];
                            }
                            var indexName = $(root.parentsReversed[parentIndex]).attr('altinn-group-index-name');
                            rootValue.indexedNames.push({ original: parts[i], indexed: parts[i] + '[' + indexName + ']' });
                            parentIndex = parentIndex + 1;
                        }
                    }
                }
            
                rootValue.disabled = disabled;
                rootValue.selectable = rootValue.type !== 'Group';
                validElements.push(rootValue);
            }
        });

        var saveModel = function(element) {
            root.value = element.id;
            $.each(element.indexedNames, function (index, value) {
                root.value = root.value.replace('.' + value.original + '.', '.' + value.indexed + '.');
            });

            root.value = root.value.substring(root.value.indexOf('.') + 1, root.value.length)

            $('#modalEditTreeView').hide();
            $('#modalEditBody').show();

            root.dispatch('model-binding-changed');
        }

        require(['views/modeltree'], function (ModelTree) {
            ModelTree.initialize(
               { elements: validElements },
               '#modelTreeView',
               '#search',
               saveModel);
        });
    }

    Model.prototype = {
        constructor: Model,

        save: function () {
            var val = this.value;
            $.each(this.elements, function (index, property) {
                if ($(property).is("[asp-validation-for]")) {
                    $(property).attr('asp-validation-for', val);
                } else {
                    $(property).attr('altinn-for', val);
                }
            });
        },

        listeners: {},

        onBindingChanged: function (property) {
            console.log('Change triggered!');
            console.log(this);
            console.log(property);
        },

        on: function (eventName, listener) {
            if (!this.listeners[eventName]) {
                this.listeners[eventName] = [];
            }

            this.listeners[eventName].push(listener);
        },

        dispatch: function (eventName) {
            console.log(eventName);
            console.log(this.listeners);
            if (this.listeners[eventName]) {
                for (var i = 0; i < this.listeners[eventName].length; i++) {
                    this.listeners[eventName][i](this);
                }
            }
        }
    }

    return Model;
});
