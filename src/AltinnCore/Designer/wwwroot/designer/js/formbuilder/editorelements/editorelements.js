define(function (require) {
    var textview = require('text!editorelements/text.html'),
        textmodel = require('editorelements/text'),
        selectview = require('text!editorelements/select.html'),
        selectmodel = require('editorelements/select'),
        checkboxview = require('text!editorelements/checkbox.html'),
        checkboxmodel = require('editorelements/checkbox'),
        grouppropertiesview = require('text!editorelements/groupproperties.html'),
        grouppropertiesmodel = require('editorelements/groupproperties'),
        elementbindingview = require('text!editorelements/elementbinding.html'),
        codelistbindingselectview = require('text!editorelements/codelistbindingselect.html'),
        codelistbindingselectmodel = require('editorelements/codelistbindingselect'),
        elementbindingmodel = require('editorelements/elementbinding'),
        buttonmodel = require('editorelements/button'),
        buttonview = require('text!editorelements/button.html'),
        anchorModel = require('editorelements/a'),
        anchorview = require('text!editorelements/a.html');

    return {
        text: {
            view: textview,
            model: textmodel
        },
        select: {
            view: selectview,
            model: selectmodel
        },
        checkbox: {
            view: checkboxview,
            model: checkboxmodel
        },
        groupproperties: {
            view: grouppropertiesview,
            model: grouppropertiesmodel
        },
        elementbinding: {
            view: elementbindingview,
            model: elementbindingmodel
        },
        codelistbindingselect: {
            view: codelistbindingselectview,
            model: codelistbindingselectmodel
        },
        button: {
            view: buttonview,
            model: buttonmodel
        },
        a: {
            view: anchorview,
            model: anchorModel
        }
    };
});
