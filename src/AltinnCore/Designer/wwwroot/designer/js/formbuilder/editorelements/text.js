define(function () {
    "use strict";

    function Model(el, $src, self, elementConfig, serviceMetadata, resources) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;

        if (elementConfig.istagcontent) {
            if ($src.attr('altinn-text')) {
                this.key = $src.attr('altinn-text');
            }
        } else {
            if ($src.attr('altinn-' + elementConfig.name)) {
                this.key = $src.attr('altinn-' + elementConfig.name);
            }
        }

        root.resources = resources;
        root.el = el;
        root.serviceMetadata = serviceMetadata;
        root.self = self;
        root.elementConfig = elementConfig;
        root.$src = $src;
        root.name = elementConfig.name;
        root.informationText = elementConfig.informationText;
        
        var onSelectBtnClick = function () {
            root.onSelectText = function (event) {
                var key = Object.keys(root.resources)[$(this).attr('index')];
                var resource = root.resources[key];
                root.key = key;
                root.resourcevalue = resource["nb-NO"];
                $('#resourcesBtns').hide();
                $('#configurationBtns').show();
                $('#resourcesModal').hide();
                $('#modalEditBody').show();
            }

            $('.selectResourceLink').off('click');
            $('.selectResourceLink').on('click', root.onSelectText);
        }
        
        root.self.find('.selectTextBtn').on('click', onSelectBtnClick);
    }

    Model.prototype = {
        constructor: Model,
        save: function () {
            if (this.elementConfig.istagcontent) {
                this.$src.attr('altinn-text', this.key);
                this.$src.html(this.resourcevalue);
            } else {
                if (this.key && this.key !== '') {
                    this.$src.attr('altinn-' + this.name, this.key);
                    this.$src.attr(this.name, this.resourcevalue);
                
                } else {
                    this.$src.removeAttr(this.name);
                }
            }
        },

        listeners: {},

        onBindingChanged: function (property) {
            // TODO: Remove hardcoding of root!
            var elementMetadata = property.serviceMetadata.elements["Skjema." + property.value];
            var key = elementMetadata.texts[this.elementConfig.resourceTextType];

            if (this.resources[key]) {
                this.key = key;
                this.resourcevalue = this.resources[key]["nb-NO"];
            }
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
                    console.log(eventName);
                    console.log(this.listeners);
                    this.listeners[eventName][i](this);
                }
            }
        }
    }

    return Model;
});
