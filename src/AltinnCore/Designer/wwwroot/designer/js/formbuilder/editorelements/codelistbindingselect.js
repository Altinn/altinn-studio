define(function () {
    "use strict";

    function Model(el, $src, self, elementConfig, serviceMetadata) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;

        // Load current value and set label content
        root.value = $src.attr('altinn-codelist');
        root.name = elementConfig.name;
        root.codelistvalue = $src.attr('altinn-value-name');

        // Populate model properties
        root.serviceMetadata = serviceMetadata;
        root.self = self;
        root.elementConfig = elementConfig;
        root.$src = $src;

        // Find direct parent group and config (if there is any)
        root.parent = $src.closest('.altinngroup');
        if (root.parent.length !== 0) {
            root.hasParent = true;
            root.parentGroupName = root.parent.data('altinn-group-name');
            root.parentGroupBinding = root.parent.data('altinn-target-model');
        }

        // Setup autocomplete for model binding
        $(root.self.find('input')).autocomplete({
            source: function (request, response) {
                var term = request.term;
                var matcher = new RegExp($.ui.autocomplete.escapeRegex(term), "i");

                var basepath = '';
                var elements = term.split('.');
                var searchElements = elements.slice(0, elements.length - 1);

                var source = root.serviceMetadata;

                $.each(searchElements, function () {
                    if (this !== '') {
                        source = source[this];

                        if (basepath !== '') {
                            basepath += '.' + this;
                        } else {
                            basepath = this;
                        }

                        matcher = new RegExp($.ui.autocomplete.escapeRegex(elements[elements.length - 1]), "i");
                    }
                });

                response($.map(Object.keys(source), function (el) {
                    if (matcher.test(el)) {
                        if (basepath !== '') {
                            return { label: el, value: basepath + '.' + el };
                        } else {
                            return { label: el, value: el };
                        }
                    }
                }));
            },
            appendTo: $(root.self.find('input').parent()),
            select: function (event, ui) {
                root.value = ui.item.value;

                return false;
            }
        });


        this.changed = function () {

        }
    }

    Model.prototype = {
        constructor: Model,

        save: function () {
            this.$src.attr('altinn-items', this.value);
            this.$src.attr('altinn-value-name', this.codelistvalue);
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