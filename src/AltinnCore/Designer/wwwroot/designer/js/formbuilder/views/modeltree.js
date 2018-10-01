define([
       "jquery", "views/bootstrap-treeview.min"
], function ($, BootstrapTreeview) {
    var root = this;
    return {
        initialize: function (serviceMetadata, treeTarget, searchTarget, saveFunction) {
            that = this;
            that.serviceMetadata = serviceMetadata;
            that.saveFunction = saveFunction;
            function createTreeFromModel(serviceModel) {
                var elements = [];

                // Get all the elements as an array
                for (var propertyName in serviceModel.elements) {
                    elements.push(serviceModel.elements[propertyName]);
                }

                // Reverse it so we can start with the root element
                elements.reverse();

                var data = [];
                for (var i = 0; i < elements.length; i++) {
                    insertElement(data, elements[i]);
                }

                for (var y = 0; y < data.length; y++) {
                    removeEmptyNodes(data[y]);
                }

                return data;
            }

            function insertElement(data, element) {
                var idParts = element.id.split('.');
                var currentData = data;
                for (var i = 0; i < idParts.length; i++) {
                    var elementExists = false;
                    var existingElement;
                    for (var x = 0; x < currentData.length; x++) {
                        if (currentData[x].id === idParts[i]) {
                            elementExists = true;
                            existingElement = currentData[x].nodes;
                            break;
                        }
                    }

                    if (!elementExists) {
                        var newElement = {
                            text: element.name,
                            id: idParts[i],
                            href: "#" + element.id,
                            nodes: [],
                            model: element,
                            selectable: element.selectable,
                            state: {
                                disabled: element.disabled
                            }
                        };

                        currentData.push(newElement);
                        currentData = newElement.nodes;
                    } else {
                        currentData = existingElement;
                    }
                }
            }

            function removeEmptyNodes(data) {
                if (data.nodes.length == 0) {
                    delete data.nodes;
                }
                else {
                    for (var i = 0; i < data.nodes.length; i++) {
                        removeEmptyNodes(data.nodes[i]);
                    }
                }
            }

            that.selectedElement = {};
            $(treeTarget).treeview({
                data: createTreeFromModel(that.serviceMetadata),
                levels: 3,
                searchResultBackColor: 'rgb(30,174,247)',
                searchResultColor: '#FFF',
                onhoverColor: '#E6F3FB',
                collapseIcon: 'fa fa-minus-square-o',
                expandIcon: 'fa fa-plus-square-o',
                onNodeSelected: function (event, data) {
                    that.selectedElement = data.model;
                }
            });

            var timer;
            $(searchTarget).keyup( function () {
                clearTimeout(timer);  //clear any running timeout on key up
                timer = setTimeout(function () { //then give it a 600ms to see if the user is finished
                    var searchInput = $(searchTarget).val();
                    $(treeTarget).treeview('collapseAll', { silent: true });
                    $(treeTarget).treeview('search', [searchInput, {
                        ignoreCase: true,     // case insensitive
                        exactMatch: false,    // like or equals
                        revealResults: true   // reveal matching nodes
                    }]);
                    
                    if(searchInput.length > 0) {
                        
                        $(treeTarget).find('li:not(.search-result)').hide();
                    } else {
                        $(treeTarget).find('li:not(.search-result)').show();
                    }
                }, 600);
            });

            $('#modelTreeSaveBtn').on('click', function () {
                that.saveFunction(that.selectedElement);
            });

            $(searchTarget).focus();
        }
    };
});
