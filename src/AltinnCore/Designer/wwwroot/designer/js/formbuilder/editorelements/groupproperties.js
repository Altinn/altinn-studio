define(function () {
    "use strict";

    function Model($src, self, serviceMetadata) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;

        root.serviceMetadata = serviceMetadata;
        root.$src = $src;
        root.self = self;

        $('#treeViewBtns').hide();
        $('#configurationBtns').show();
        $('#modalEditTreeView').hide();
        $('#modalEditBody').show();

        root.groupName = $src.attr('altinn-group-name');
        root.targetModel = $src.attr('altinn-group-binding');
        root.indexName = $src.attr('altinn-group-index-name');

        root.indexParameterName = $src.attr('altinn-group-index-param-name');

        if (root.indexParameterName) {
            root.useParameterAsIndex = true;
        }

        root.parent = $src.parent().closest('.altinngroup');

        if (root.parent.length !== 0) {
            root.hasParent = true;
            root.parentGroupName = root.parent.attr('altinn-group-name');
            root.parentGroupBinding = root.parent.attr('altinn-group-binding');
            root.parentGroupIndexName = root.parent.attr('altinn-group-index-name');
        }

        root.parents = root.$src.parents('[altinn-group-binding]');
        root.parentsReversed = [];
        root.parents.each(function (index, e) {
            root.parentsReversed.push(e);
        });

        root.parentsReversed = root.parentsReversed.reverse();
        var setGroupProperties = function (elements) {
            root.parent = $(root.self).closest('[altinn-group-binding]');
            if (root.parent.length !== 0) {
                root.hasParent = true;

                root.parentGroupName = root.parent.attr('altinn-group-name');
                root.parentGroupBinding = root.parent.attr('altinn-group-binding');
                root.parentGroupIndexName = root.parent.attr('altinn-group-index-name');
            }
        }

        console.log(root.parentsReversed);
        // Filter the model elements based on context
        var validElements = [];
        var metadataKeys = Object.keys(root.serviceMetadata.elements);

        $.each(root.serviceMetadata.elements, function (index, rootValue) {
            if (root.parentsReversed.length === 0
                || rootValue.id.startsWith($(root.parentsReversed[root.parentsReversed.length - 1]).attr('altinn-group-binding'))
                || $(root.parentsReversed[root.parentsReversed.length - 1]).attr('altinn-group-binding').startsWith(rootValue.id)) {
                var parts = rootValue.id.split('.');

                rootValue.selectable = true;
                if (parts.length === 1) {
                    rootValue.selectable = false;
                }

                var tempPath = parts[0];
                var disabled = false;

                for (var i = 1; i < parts.length; i++) {
                    tempPath = tempPath + '.' + parts[i];
                    var parentIndex = 0;
                    var value = root.serviceMetadata.elements[tempPath];

                    if (value.type === 'Group') {
                        if (value.maxOccurs > 1) {
                            var levelParts = value.id.split('.');
                            levelParts.pop();
                            var previousLevel = levelParts.join('.');
                            var closestRepeatingGroup = findClosestRepeatingGroup(previousLevel);

                            if ($(root.parentsReversed[parentIndex]).attr('altinn-group-binding') !== closestRepeatingGroup
                                && closestRepeatingGroup.length > 0) {
                                disabled = true;
                            } else {
                                rootValue.selectable = true;
                                parentIndex = parentIndex + 1;
                            }
                        } else {
                            rootValue.selectable = false;
                        }
                    }
                }

                rootValue.disabled = disabled;
                if (rootValue.type === 'Group') {
                    validElements.push(rootValue);
                }
            }
        });

        function findClosestRepeatingGroup(elementId) {
            var element = root.serviceMetadata.elements[elementId];
            if (elementId.length === 0) {
                return elementId;
            }

            if (element.maxOccurs > 1) {
                return elementId;
            } else {
                var parts = elementId.split('.');
                parts.pop();
                return findClosestRepeatingGroup(parts.join('.'));
            }
        }

        var saveModel = function (element) {
            root.targetModel = element.id;
            $('#modalEditTreeView').hide();
            $('#modalEditBody').show();
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
            this.$src.attr('altinn-group-name', this.groupName);
            this.$src.attr('altinn-group-binding', this.targetModel);
            if (this.useParameterAsIndex) {
                console.log('test123');
                this.$src.attr('altinn-group-index-param-name', this.indexParameterName);
                this.$src.removeAttr('altinn-group-index-name');
            } else {
                console.log('test321');
                this.$src.attr('altinn-group-index-name', this.indexName);
                this.$src.removeAttr('altinn-group-index-param-name');
            }
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
            if (this.listeners[eventName]) {
                for (var i = 0; i < this.listeners[eventName].length; i++) {
                    this.listeners[eventName][i](this);
                }
            }
        }
    }

    return Model;
});
