export const rule1Name = 'sum';
export const rule1Input1Name = 'a';
export const rule1Input1Label = 'a';
export const rule1Input2Name = 'b';
export const rule1Input2Label = 'b';
export const rule2Name = 'fullName';
export const rule2Input1Name = 'first';
export const rule2Input1Label = 'first name';
export const rule2Input2Name = 'last';
export const rule2Input2Label = 'last name';
export const condition1Name = 'biggerThan10';
export const condition1Input1Name = 'number';
export const condition1Input1Label = 'number';
export const condition2Name = 'smallerThan10';
export const condition2Input1Name = 'number';
export const condition2Input1Label = 'number';
export const condition3Name = 'lengthBiggerThan4';
export const condition3Input1Name = 'value';
export const condition3Input1Label = 'value';

export default `
  var ruleHandlerObject = {
    ${rule1Name}: function(obj) {
      obj.${rule1Input1Name} = obj.${rule1Input1Name} ? +obj.${rule1Input1Name} : 0;
      obj.${rule1Input2Name} = obj.${rule1Input2Name} ? +obj.${rule1Input2Name} : 0;
      return obj.${rule1Input1Name} + obj.${rule1Input2Name};
    },

    ${rule2Name}: function(obj) {
      return obj.${rule2Input1Name} + ' ' + obj.${rule2Input2Name};
    }
  }

  var ruleHandlerHelper = {
    ${rule2Name}: function() {
      return {
        ${rule2Input1Name}: "${rule2Input1Label}",
        ${rule2Input2Name}: "${rule2Input2Label}"
      };
    },
    ${rule1Name}: function() {
      return {
        ${rule1Input1Name}: "${rule1Input1Label}",
        ${rule1Input2Name}: "${rule1Input2Label}",
      }
    }
  }

  var conditionalRuleHandlerObject = {
    ${condition1Name}: function(obj) {
      obj.${condition1Input1Name} = +obj.${condition1Input1Name};
      return obj.${condition1Input1Name} > 10;
    },
    ${condition2Name}: function(obj) {
      obj.${condition2Input1Name} = +obj.${condition2Input1Name};
      return obj.${condition2Input1Name} < 10;
    },
    ${condition3Name}: function(obj) {
      if (obj.${condition3Input1Name} == null) return false;
      return obj.${condition3Input1Name}.length > 4;
    }
  }

  var conditionalRuleHandlerHelper = {
    ${condition1Name}: function() {
      return {
        ${condition1Input1Name}: "${condition1Input1Label}"
      };
    },
    ${condition2Name}: function() {
      return {
        ${condition2Input1Name}: "${condition2Input1Label}"
      }
    },
    ${condition3Name}: function() {
      return {
        ${condition3Input1Name}: "${condition3Input1Label}"
      }
    }
  }
`;
