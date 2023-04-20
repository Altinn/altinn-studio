var ruleHandlerObject = {
    sum: function(obj) {
        obj.a = +obj.a;
        obj.b = +obj.b;
        obj.c = +obj.c;
        return obj.a + obj.b + obj.c;
    },

    fullName: function(obj) {
        return obj.first + ' ' + obj.last;
    },

    nyttNavn: function(obj) {
        obj.fornavn = obj.fornavn ? obj.fornavn + ' ' : '';
        obj.mellomnavn = obj.mellomnavn ? obj.mellomnavn + ' ' : '';
        obj.etternavn = obj.etternavn ? obj.etternavn : '';        
        return obj.fornavn + obj.mellomnavn + obj.etternavn;
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
            c: "c"
        }
    },

    nyttNavn: function() {
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

    sjekkNyttNavnSatt: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkNavnendringBekreftelse: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkNavnendringAvkreftelse: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSlektskap: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSteforeldre: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseSamboer: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseTidligereNavn: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseGardsbruk: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseNyttNavn: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkBegrunnelseAnnet: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkRadioBtnHuket: function() {
        return {
            value: "Verdi"
        }
    },

    sjekkeInputGyldig: function() {
        return {
            value: "Verdi"
        }
    }
}