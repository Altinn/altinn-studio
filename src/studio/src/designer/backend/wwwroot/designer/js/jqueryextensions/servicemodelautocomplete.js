/*
 * Implemented using http://jsfiddle.net/sgxkj/ as an example for extending jQuery UI autocomplete
 * This class should enable users to create complex rules in a simple format, and the resulting object is used by the server
 * to generate C# code using a set of pre-defined templates
 */

(function ($, undefined) {
    if (typeof $.uix !== "object") { $.uix = {}; }
    var ac = $.ui.autocomplete.prototype;
    var _super = {
        _create: ac._create,
        _destroy: ac._destroy,
        _resizeMenu: ac._resizeMenu,
        _suggest: ac._suggest,
        search: ac.search,
        open: ac.open,
        close: ac.close
    };
    ac = $.extend({}, ac, {
        options: $.extend({}, ac.options, {
            modelAutocomplete: false,
            ruleCreator: false,
            serviceMetadata: ""
        }),
        _create: function () {
            var self = this,
                o = self.options;
            _super._create.apply(self);

            o.modelValueSource = function (request, response) {
                var term = request.term;
                var source = o.serviceMetadata;
                var valueStart = '';
                if (term.indexOf('$') === 0) {
                    if (term.indexOf('(') === -1) {
                        return ['$sum(', '$count('];
                    } else if (term.indexOf('(') > 0) {
                        valueStart = term.substring(0, term.indexOf('(') + 1);
                        term = term.substring(term.indexOf('(') + 1);
                        console.log(term);
                    }
                }


                return $.map(source.elements, function (el) {
                    var indexOfDot = el.id.indexOf('.');
                    var elSub = el.id;

                    var numIndexRegex = new RegExp(/\[[0-9]*\]/g);
                    var varIndexRegex = new RegExp(/\[.*\]/g);

                    if (elSub.startsWith(term)
                        || term.indexOf('.') === -1) {
                        var idParts = el.id.split('.');
                        var fullPath = '';
                        var valid = true;

                        var termParts = term.split('.');

                        var lastGroupElement = '';
                        for (var i = 0; i < idParts.length; i++) {
                            if (i > 0) {
                                fullPath += '.';
                            }

                            fullPath += idParts[i];
                            var regex = new RegExp(idParts[i] + '\\[.*\\]');
                            if (source.elements[fullPath].MaxOccurs > 1
                                && (i + 1) !== idParts.length
                                && !(termParts[i] && termParts[i].regexIndexOf(regex) > -1)) {
                            }

                            if (i >= termParts.length) {
                                valid = false;
                                break;
                            }
                        }

                        if (valid) {
                            var termPart = term;

                            var escapedString = termPart.replace(numIndexRegex, '').replace(varIndexRegex, '');

                            var label = elSub.replace(escapedString, termPart);
                            var value = label;

                            return { label: label.substring(label.lastIndexOf('.') + 1, label.length), value: valueStart + value };
                        }
                    }
                });
            }

            // This is a rule creator input, and the items must therefore be an object containing available rule components
            // The rule components can be conditions, actions, group seperators, delimiters and platform functions (sum, avg, length etc.)
            if (o.modelAutocomplete) {
                self.modelAutocomplete = $("<div></div>")
                    .addClass("ui-autocomplete-rulecreator ui-state-default ui-widget")
                    .css("width", self.element.width())
                    .insertBefore(self.element)
                    .append(self.element)
                    .bind("click.autocomplete", function () {
                        self.element.focus();
                    });

                var kc = $.ui.keyCode;
                self.element.bind({
                }).trigger("change");
                o.source = function (request, response) {
                    response(o.modelValueSource(request, response));
                }

                //function getResponse(settings, elements) {
                //    return $.map(elements, function (el) {
                //        var validElement = false;

                //        if (validElement) {
                //            return { label: '', value: '', element: el };
                //        }
                //    });
                //}
            } else if (o.ruleCreator) {
                self.ruleContainer = {};
                self.ruleParts = {};
                self.ruleCreator = $("<div></div>")
                    .addClass("ui-autocomplete-rulecreator ui-state-default ui-widget")
                    .css("width", self.element.width())
                    .insertBefore(self.element)
                    .append(self.element)
                    .bind("click.autocomplete", function () {
                        self.element.focus();
                    });

                var kctwo = $.ui.keyCode;
                self.element.bind({
                    "keydown.autocomplete": function (e) {
                        if ((this.value === "") && (e.keyCode === kctwo.BACKSPACE)) {
                            var prev = self.element.prev();
                            delete self.ruleParts[prev.text()];
                            prev.remove();
                        }
                    },
                    // TODO: Implement outline of container
                    "focus.autocomplete blur.autocomplete": function () {
                        self.ruleCreator.toggleClass("ui-state-active");
                    }
                }).trigger("change");

                o.source = o.source || function (request, response) {
                    //var source = src; // TODO!!
                    var term = request.term;
                    var currentIndex = 0;
                    var availableElements = {
                        value: false,
                        delimiters: false,
                        groupStart: false,
                        groupEnd: false,
                        functionStart: false,
                        functionEnd: false
                    }
                    var existingElements = [];

                    if (!existingElements[currentIndex - 1] || previousElement.type === 'groupStart') {
                        availableElements.value = true;
                        availableElements.groupStart = true;
                        availableElements.functionStart = true;
                    } else if (previousElement.type === 'value') {
                        // Make the following elements available in src:
                        availableElements.delimiters = true;
                    } else if (previousElement.type === 'delimiter') {
                        // Make the following elements available in src:
                        availableElements.value = true;
                        availableElements.groupStart = true;
                        availableElements.functionStart = true;
                    } else if (previousElement.type === 'groupEnd') {
                        // Make the following elements available in src:
                        availableElements.delimiters = true;

                        //TODO: Check if open group exists
                        availableElements.groupEnd = true;
                        //END TODO
                    } else if (previousElement.type === 'functionStart') {
                        // Make the following elements available in src:
                        // - value (comma seperated times the number of parameters), fixed or element from metadata (based on parameter configuration?)
                    } else if (previousElement.type === 'functionEnd') {
                        // Make the following elements available in src:
                        availableElements.delimiters = true;

                        //TODO: Check if open group exists
                        availableElements.groupEnd = true;
                        //END TODO
                    }

                    var responseList = [];
                    if (availableElements.value) {
                        responseList = responseList.concat(o.modelValueSource(request, response));
                        console.log(responseList);
                    }

                    response(responseList);
                }

                //function getResponse(elements) {
                //    return $.map(elements, function (el) {
                //        var validElement = false;

                //        if (validElement) {
                //            return { label: '', value: '', element: el };
                //        }
                //    });
                //}

                o.select = o.select || function (e, ui) {
                    var item = ui.item;

                    // TODO: Manipulate the rulecontainer based on the selected item
                    // Example:
                    if (item.element.type === 'groupStart') {
                        currentContainer.childContainers.push({});
                        currentContainer = currentContainer.childContainers[childContainers.length - 1];
                    } else if (item.element.type === 'delimiter') {
                        currentContainer.delimiters.push(item.element.value);
                    } else if (item.element.type === 'value') {

                    }

                    $("<div></div>")
                        .addClass("ui-autocomplete-ruleCreator-item")
                        .text(ui.item.label)
                        .append(
                            $("<span></span>")
                                .addClass("ui-icon ui-icon-close")
                                .click(function () {
                                    var item = $(this).parent();
                                    delete self.selectedItems[item.text()];
                                    item.remove();
                                })
                        )
                        .insertBefore(self.element);

                    self.selectedItems[ui.item.label] = ui.item;
                    self._value("");
                    return false;
                }
            }
            return this;
        },
        _resizeMenu: function () {
            if (this.options.ruleCreator) {
                var ul = this.menu.element;
                ul.outerWidth(Math.max(
                    ul.width("").outerWidth(),
                    this.ruleCreator.outerWidth()
                ));
            } else {
                _super._resizeMenu.apply(this);
            }
        },
        _suggest: function (items) {
            var elm = this.element;
            this.element = this.options.ruleCreator ? this.ruleCreator : this.element;
            _super._suggest.apply(this, [items]);
            this.element = elm;
        },
        search: function (value, event) {
            value = value !== null ? value : this._value();
            if (this.options.triggerChar) {
                if (value.substring(0, 1) !== this.options.triggerChar) {
                    return;
                } else {
                    value = value.substring(1);
                }
            }

            this.source = this.options.source;
            return _super.search.apply(this, [value, event]);
        },
        // Borrowed from 1.9
        _value: function (value) {
            return this.valueMethod.apply(this.element, arguments);
        },
        // Borrowed from 1.9
        valueMethod: function () {
            var result = this[this.is("input") ? "val" : "text"].apply(this, arguments);
            this.trigger("change");
            return result;
        }
    });

    $.uix.autocomplete = ac;
    $.widget("uix.autocomplete", $.uix.autocomplete);
})(jQuery);