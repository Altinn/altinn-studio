define(function (require) {
    var //appendedCheckbox =  require('text!components/appendedcheckbox.html'),
        //textinput =         require('text!components/textinput.html'),
        //appendedText =      require('text!components/appendedtext.html'),
        //buttonDropdown =    require('text!components/buttondropdown.html'),

        // Input
        inputTextWithLabel = require('text!components/inputTextWithLabel.html'),
        inputTextareaWithLabel = require('text!components/inputTextareaWithLabel.html'),
        inputDateWithLabel = require('text!components/inputDateWithLabel.html'),
        inputCheckboxWithLabel = require('text!components/inputCheckboxWithLabel.html'),
        selectWithLabel = require('text!components/selectWithLabel.html'),
        radioListWithLabel = require('text!components/radioListWithLabel.html'),
        range = require('text!components/range.html'),
        navigationbutton = require('text!components/navigationbutton.html'),
        navigationanchor = require('text!components/navigationanchor.html'),
        //doubleInputTextWithLabel =  require('text!components/2xInputTextWithLabel.html'),

        // Layout
        layout1col = require('text!components/layout1col.html'),
        layout2col = require('text!components/layout2col.html'),
        layout2col_small_large = require('text!components/layout2col_large_small.html'),
        layout2col_large_small = require('text!components/layout2col_small_large.html'),
        layout3col = require('text!components/layout3col.html'),
        layout4col = require('text!components/layout4col.html'),

        // Text
        paragraph = require('text!components/paragraph.html'),
        header1 = require('text!components/header1.html'),
        header2 = require('text!components/header2.html'),
        header3 = require('text!components/header3.html'),

        // Media
        fileBrowser = require('text!components/fileBrowser.html');

    // Tables
    // TODO

    return {
        coreComponents: {
            label: "Input",
            icon: "fa-check-square",
            controls: [
                {
                    id: "inputTextWithLabel",
                    name: "Input with label",
                    src: inputTextWithLabel
                }, {
                    id: "inputTextareaWithLabel",
                    name: "Textarea with label",
                    src: inputTextareaWithLabel
                },
                {
                    id: "inputCheckboxWithLabel",
                    name: "Checkbox with label",
                    src: inputCheckboxWithLabel
                },
                {
                    id: "inputDateWithLabel",
                    name: "Date with label",
                    src: inputDateWithLabel
                },
                {
                    id: "selectWithLabel",
                    name: "Select with label",
                    src: selectWithLabel
                },
                {
                    id: "radioListWithLabel",
                    name: "Radio list with label",
                    src: radioListWithLabel
                },
                {
                    id: "range",
                    name: "Range",
                    src: range
                },
                {
                    id: "navButton",
                    name: "Navigation button",
                    src: navigationbutton
                },
                {
                    id: "navAnchor",
                    name: "Navigation anchor",
                    src: navigationanchor
                }
                /*,{
                    id: "2xInputTextWithLabel",
                    name: "2x input with label",
                    src: doubleInputTextWithLabel
                }*/
            ]
        },
        layout: {
            label: "Layout",
            icon: "fa-newspaper",
            controls: [
                {
                    id: "layout1col",
                    name: "One column",
                    src: layout1col
                },
                {
                    id: "layout2col",
                    name: "Two columns",
                    src: layout2col
                },
                {
                    id: "layout4col",
                    name: "Three columns",
                    src: layout3col
                },
                {
                    id: "layout4col",
                    name: "Four columns",
                    src: layout4col
                },
                {
                    id: "layout2col_small_large",
                    name: "Two columns - Small/Large",
                    src: layout2col_small_large
                },
                {
                    id: "layout2col_large_small",
                    name: "Two columns - Large/Small",
                    src: layout2col_large_small
                }
            ]
        },
        headers: {
            label: "Tekst",
            icon: "fa-quote-left",
            controls: [
                {
                    id: "paragraph",
                    name: "Paragraf",
                    src: paragraph
                },
                {
                    id: "header1",
                    name: "Header H1",
                    src: header1
                },
                {
                    id: "header2",
                    name: "Header H2",
                    src: header2
                },
                {
                    id: "header3",
                    name: "Header H3",
                    src: header3
                }
            ]
        },
        media: {
            label: "Media",
            icon: "fa-image",
            controls: [
                {
                    id: "fileBrowser",
                    name: "Upload files",
                    src: fileBrowser
                }
            ]
        },
        tables: {
            label: "Tabeller",
            icon: "fa-table",
            controls: [

            ]
        }
    };
});
