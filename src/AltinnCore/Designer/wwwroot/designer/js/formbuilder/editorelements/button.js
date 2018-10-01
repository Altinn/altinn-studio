define(function () {
    "use strict";

    function Model(el, $src, self, elementConfig, serviceMetadata, resources) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;
        root.$src = $src;
        root.action = $src.attr('name');
    }

    Model.prototype = {
        constructor: Model,
        save: function () {
            this.$src.attr('name', this.action);
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