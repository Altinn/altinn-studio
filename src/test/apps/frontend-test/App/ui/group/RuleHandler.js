var ruleHandlerObject = {
  sum: function(obj) {
    obj.a = obj.a ? +obj.a : 0;
    obj.b = obj.b ? +obj.b : 0;
    return obj.a + obj.b;
  },

  fullName: function(obj) {
    return obj.first + ' ' + obj.last;
  },

  copyToPrefillShadow: function (obj) {
    const enabled = obj.enabled === 'true' || obj.enabled === true || obj.enabled === undefined || obj.enabled === null;
    return enabled ? obj.shadow : obj.values;
  }
}

var conditionalRuleHandlerObject = {
  biggerThan10: function(obj) {
    obj.number = +obj.number;
    return obj.number > 10;
  },

  smallerThan10: function(obj) {
    obj.number = +obj.number;
    return obj.number > 10;
  },

  lengthBiggerThan4: function(obj) {
    if (obj.value == null) return false;
    return obj.value.length >= 4;
  },

  showGroup: function(obj) {
    return (obj.value === "Ja");
  },

  showExtraOptions: function (obj) {
    return (obj.value === 'Ja');
  },

  hideCommentField: function (obj) {
    return (obj.value === 'Ja');
  }
}