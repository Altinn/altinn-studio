var ruleHandlerObject = {
  sum: function(obj) {
    obj.a = obj.a ? +obj.a : 0;
    obj.b = obj.b ? +obj.b : 0;
    return obj.a + obj.b;
  },

  fullName: function(obj) {
    return obj.first + ' ' + obj.last;
  }
}
var ruleHandlerHelper = {
  fullName: function() {
    return {
      first: "first name",
      last: "last name"
    };
  },

  sum: function() {
    return {
      a: "a",
      b: "b",
    }
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
var conditionalRuleHandlerHelper = {
  biggerThan10: function() {
    return {
      number: "number"
    };
  },

  smallerThan10: function() {
    return {
      number: "number"
    }
  },

  lengthBiggerThan4: function() {
    return {
      value: "value"
    }
  },

  showGroup: function() {
    return {
        value: "value"
    }
  },

  showExtraOptions: function () {
    return {
      value: 'value'
    }
  },
  hideCommentField: function () {
    return {
      value: 'value'
    }
  }
}
