define(function () {
    "use strict";

    function Model(el, $src, self, elementConfig) {
        if (!(this instanceof Model)) {
            throw new TypeError("Model constructor cannot be called as a function.");
        }

        var root = this;
        
        this.$src = $src;

        if (el) {
            this.value = el.value;
        } else {
            this.value = '';
        }

        this.name = elementConfig.name;

        this.isResourceKey = false;

        this.changed = function () {
           
        }
    }

    Model.prototype = {
        constructor: Model,

        save: function () {
            if (this.value && this.value !== '') {
                this.$src.attr(this.name, this.value);
            } else {
                this.$src.removeAttr(this.name);
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