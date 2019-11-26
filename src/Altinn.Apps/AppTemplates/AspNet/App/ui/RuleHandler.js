var ruleHandlerObject = {
  sum: (obj) => {
    obj.a = obj.a ? +obj.a : 0;
    obj.b = obj.b ? +obj.b : 0;
    return obj.a + obj.b;
  },

  fullName: (obj) => {
    return obj.first + ' ' + obj.last;
  }
}
var ruleHandlerHelper = {
  fullName: () => {
    return {
      first: "first name",
      last: "last name"
    };
  },

  sum: () => {
    return {
      a: "a",
      b: "b",
    }
  }
}

var conditionalRuleHandlerObject = {
  biggerThan10: (obj) => {
    obj.number = +obj.number;
    return obj.number > 10;
  },

  smallerThan10: (obj) => {
    obj.number = +obj.number;
    return obj.number > 10;
  },

  lengthBiggerThan4: (obj) => {
    if (obj.value == null) return false;
    return obj.value.length >= 4;
  }
}
var conditionalRuleHandlerHelper = {
  biggerThan10: () => {
    return {
      number: "number"
    };
  },

  smallerThan10: () => {
    return {
      number: "number"
    }
  },

  lengthBiggerThan4: () => {
    return {
      value: "value"
    }
  }

}
