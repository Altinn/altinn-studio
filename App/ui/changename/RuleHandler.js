var ruleHandlerObject = {
    sum: (obj) => {
        obj.a = +obj.a;
        obj.b = +obj.b;
        obj.c = +obj.c;
        return obj.a + obj.b + obj.c;
    },

    fullName: (obj) => {
        return obj.first + ' ' + obj.last;
    },

    nyttNavn: (obj) => {
        obj.fornavn = obj.fornavn ? obj.fornavn + ' ' : '';
        obj.mellomnavn = obj.mellomnavn ? obj.mellomnavn + ' ' : '';
        obj.etternavn = obj.etternavn ? obj.etternavn : '';        
        return obj.fornavn + obj.mellomnavn + obj.etternavn;
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
            c: "c"
        }
    },

    nyttNavn: () => {
        return {
            fornavn: "fornavn",
            mellomnavn: "mellomnavn",
            etternavn: "etternavn"
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

    sjekkNyttNavnSatt: function(obj) {
        return (obj.value && obj.value.length > 0);
    },

    sjekkNavnendringBekreftelse: function(obj) {
        return (obj.value && obj.value === "Ja");
    },

    sjekkNavnendringAvkreftelse: function(obj) {
        return (!obj.value || obj.value != "Ja");
    },

    sjekkBegrunnelseSlektskap: function(obj) {
        return (obj.value && obj.value === "1");
    },

    sjekkBegrunnelseSteforeldre: function(obj) {
        return (obj.value && obj.value === "3");
    },

    sjekkBegrunnelseSamboer: function(obj) {
        return (obj.value && obj.value === "5");
    },

    sjekkBegrunnelseTidligereNavn: function(obj) {
        return (obj.value && obj.value === "6");
    },

    sjekkBegrunnelseGardsbruk: function(obj) {
        return (obj.value && obj.value === "7");
    },

    sjekkBegrunnelseNyttNavn: function(obj) {
        return (obj.value && obj.value === "8");
    },

    sjekkBegrunnelseAnnet: function(obj) {
        return (obj.value && obj.value === "9");
    },

    sjekkRadioBtnHuket: function(obj) {
        return (obj.value && (obj.value === "1" || obj.value === "2" || obj.value === "3"
            || obj.value === "4" || obj.value === "5" || obj.value === "6" || obj.value === "7"
            || obj.value === "8" || obj.value === "9"));
    }

    /*sjekkRadioBtnHuket: function(obj) {
      return (obj.value && (obj.value === "2" || obj.value === "4" ||  obj.value === "6"));
    },
  
    sjekkeInputGyldig: function(obj) {
      console.log(obj);
      return (obj.value && obj.value.length > 0);
    }*/

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
    },

    sjekkNyttNavnSatt: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkNavnendringBekreftelse: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkNavnendringAvkreftelse: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSlektskap: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSteforeldre: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSamboer: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseTidligereNavn: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseGardsbruk: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseNyttNavn: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseAnnet: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkRadioBtnHuket: () => {
        return {
            value: "Verdi"
        }
    },

    sjekkeInputGyldig: () => {
        return {
            value: "Verdi"
        }
    }
}