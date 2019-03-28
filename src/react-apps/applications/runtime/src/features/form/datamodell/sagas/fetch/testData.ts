export const dataModel: any = {
  "Org": "TestOrg",
  "ServiceName": "TestService",
  "RepositoryName": "TestService",
  "ServiceId": null,
  "Elements": {
    "Skjema.skjemanummer": {
      "ID": "Skjema.skjemanummer",
      "ParentElement": "Skjema",
      "TypeName": "Integer",
      "Name": "skjemanummer",
      "DataBindingName": null,
      "XPath": "/Skjema/skjemanummer",
      "Restrictions": {},
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "Integer",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "skjemanummer",
      "IsTagContent": false,
      "FixedValue": "1250",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/skjemanummer",
      "DisplayString": "Skjema.skjemanummer : [1..1] Integer"
    },
    "Skjema.spesifikasjonsnummer": {
      "ID": "Skjema.spesifikasjonsnummer",
      "ParentElement": "Skjema",
      "TypeName": "Integer",
      "Name": "spesifikasjonsnummer",
      "DataBindingName": null,
      "XPath": "/Skjema/spesifikasjonsnummer",
      "Restrictions": {},
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "Integer",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "spesifikasjonsnummer",
      "IsTagContent": false,
      "FixedValue": "10388",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/spesifikasjonsnummer",
      "DisplayString": "Skjema.spesifikasjonsnummer : [1..1] Integer"
    },
    "Skjema.blankettnummer": {
      "ID": "Skjema.blankettnummer",
      "ParentElement": "Skjema",
      "TypeName": "String",
      "Name": "blankettnummer",
      "DataBindingName": null,
      "XPath": "/Skjema/blankettnummer",
      "Restrictions": {},
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "blankettnummer",
      "IsTagContent": false,
      "FixedValue": "PS-101",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/blankettnummer",
      "DisplayString": "Skjema.blankettnummer : [0..1] String"
    },
    "Skjema.tittel": {
      "ID": "Skjema.tittel",
      "ParentElement": "Skjema",
      "TypeName": "String",
      "Name": "tittel",
      "DataBindingName": null,
      "XPath": "/Skjema/tittel",
      "Restrictions": {},
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "tittel",
      "IsTagContent": false,
      "FixedValue": "SÃ¸knad om patent",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/tittel",
      "DisplayString": "Skjema.tittel : [0..1] String"
    },
    "Skjema.gruppeid": {
      "ID": "Skjema.gruppeid",
      "ParentElement": "Skjema",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5808",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/gruppeid",
      "DisplayString": "Skjema.gruppeid : [0..1] Integer"
    },
    "Skjema.etatid": {
      "ID": "Skjema.etatid",
      "ParentElement": "Skjema",
      "TypeName": "String",
      "Name": "etatid",
      "DataBindingName": "etatid",
      "XPath": "/Skjema/etatid",
      "Restrictions": {
        "enumeration": {
          "Value": "971526157",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "etatid",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/etatid",
      "DisplayString": "Skjema.etatid : [0..1] String"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.gruppeid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.gruppeid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5809",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllingAvSkjema-grp-5809/properties/gruppeid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.gruppeid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.gruppeid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.gruppeid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Sporsmalgrp5810/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5810",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Sporsmal-grp-5810/properties/gruppeid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.gruppeid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Sporsmalgrp5810/UtfyllerFullmaktshaverdatadef25350/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25350",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllerFullmaktshaver-datadef-25350/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.sporsmalgrp5810.utfyllerFullmaktshaverdatadef25350.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Sporsmalgrp5810/UtfyllerFullmaktshaverdatadef25350/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25350.UtfyllerFullmaktshaverdatadef25350.Label",
        "Help": "25350.UtfyllerFullmaktshaverdatadef25350.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllerFullmaktshaver-datadef-25350/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810",
      "TypeName": "UtfyllerFullmaktshaverdatadef25350",
      "Name": "UtfyllerFullmaktshaverdatadef25350",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Sporsmalgrp5810/UtfyllerFullmaktshaverdatadef25350",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25350.UtfyllerFullmaktshaverdatadef25350.Label",
        "Help": "25350.UtfyllerFullmaktshaverdatadef25350.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "UtfyllerFullmaktshaver-datadef-25350",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Sporsmal-grp-5810/properties/UtfyllerFullmaktshaver-datadef-25350",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810.UtfyllerFullmaktshaverdatadef25350 : [1..1] UtfyllerFullmaktshaverdatadef25350"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809",
      "TypeName": "Sporsmalgrp5810",
      "Name": "Sporsmalgrp5810",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Sporsmalgrp5810",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Sporsmal-grp-5810",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllingAvSkjema-grp-5809/properties/Sporsmal-grp-5810",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Sporsmalgrp5810 : [0..1] Sporsmalgrp5810"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.gruppeid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.gruppeid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5811",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/gruppeid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.gruppeid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetOrganisasjonsnummerdatadef15761/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "15761",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetOrganisasjonsnummer-datadef-15761/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761",
      "TypeName": "Tekst99Modulus11repformat1",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.orggrp5811.virksomhetOrganisasjonsnummerdatadef15761.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetOrganisasjonsnummerdatadef15761/value",
      "Restrictions": {
        "length": {
          "Value": "9",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetOrganisasjonsnummer-datadef-15761/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761.value : [1..1] Tekst99Modulus11repformat1"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "VirksomhetOrganisasjonsnummerdatadef15761",
      "Name": "VirksomhetOrganisasjonsnummerdatadef15761",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetOrganisasjonsnummerdatadef15761",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VirksomhetOrganisasjonsnummer-datadef-15761",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/VirksomhetOrganisasjonsnummer-datadef-15761",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetOrganisasjonsnummerdatadef15761 : [0..1] VirksomhetOrganisasjonsnummerdatadef15761"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetNavndatadef15756/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "15756",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetNavn-datadef-15756/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756",
      "TypeName": "Tekst175repformat8",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.orggrp5811.virksomhetNavndatadef15756.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetNavndatadef15756/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "175",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetNavn-datadef-15756/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756.value : [1..1] Tekst175repformat8"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "VirksomhetNavndatadef15756",
      "Name": "VirksomhetNavndatadef15756",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetNavndatadef15756",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VirksomhetNavn-datadef-15756",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/VirksomhetNavn-datadef-15756",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetNavndatadef15756 : [0..1] VirksomhetNavndatadef15756"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetAdressedatadef25453/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25453",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetAdresse-datadef-25453/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453",
      "TypeName": "Tekst105repformat9",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.orggrp5811.virksomhetAdressedatadef25453.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetAdressedatadef25453/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "105",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetAdresse-datadef-25453/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453.value : [1..1] Tekst105repformat9"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "VirksomhetAdressedatadef25453",
      "Name": "VirksomhetAdressedatadef25453",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetAdressedatadef25453",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VirksomhetAdresse-datadef-25453",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/VirksomhetAdresse-datadef-25453",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetAdressedatadef25453 : [0..1] VirksomhetAdressedatadef25453"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPostnummerdatadef15808/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "15808",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetPostnummer-datadef-15808/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808",
      "TypeName": "Tekst44BareTallrepformat10",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.orggrp5811.virksomhetPostnummerdatadef15808.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPostnummerdatadef15808/value",
      "Restrictions": {
        "length": {
          "Value": "4",
          "ErrortText": null
        },
        "pattern": {
          "Value": "[0-9]{4}",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetPostnummer-datadef-15808/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808.value : [1..1] Tekst44BareTallrepformat10"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "VirksomhetPostnummerdatadef15808",
      "Name": "VirksomhetPostnummerdatadef15808",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPostnummerdatadef15808",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VirksomhetPostnummer-datadef-15808",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/VirksomhetPostnummer-datadef-15808",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPostnummerdatadef15808 : [0..1] VirksomhetPostnummerdatadef15808"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPoststeddatadef15809/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "15809",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetPoststed-datadef-15809/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809",
      "TypeName": "Tekst35repformat3",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.orggrp5811.virksomhetPoststeddatadef15809.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPoststeddatadef15809/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "35",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VirksomhetPoststed-datadef-15809/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809.value : [1..1] Tekst35repformat3"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "TypeName": "VirksomhetPoststeddatadef15809",
      "Name": "VirksomhetPoststeddatadef15809",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811/VirksomhetPoststeddatadef15809",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VirksomhetPoststed-datadef-15809",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Org-grp-5811/properties/VirksomhetPoststed-datadef-15809",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811.VirksomhetPoststeddatadef15809 : [0..1] VirksomhetPoststeddatadef15809"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809",
      "TypeName": "Orggrp5811",
      "Name": "Orggrp5811",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Orggrp5811",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Org-grp-5811",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllingAvSkjema-grp-5809/properties/Org-grp-5811",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Orggrp5811 : [0..1] Orggrp5811"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.gruppeid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.gruppeid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5812",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/gruppeid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.gruppeid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFodselsnummerdatadef26/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "26",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverFodselsnummer-datadef-26/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26",
      "TypeName": "Tekst1111Modulus11repformat18",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverFodselsnummerdatadef26.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFodselsnummerdatadef26/value",
      "Restrictions": {
        "length": {
          "Value": "11",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverFodselsnummer-datadef-26/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26.value : [1..1] Tekst1111Modulus11repformat18"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverFodselsnummerdatadef26",
      "Name": "OppgavegiverFodselsnummerdatadef26",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFodselsnummerdatadef26",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverFodselsnummer-datadef-26",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverFodselsnummer-datadef-26",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFodselsnummerdatadef26 : [0..1] OppgavegiverFodselsnummerdatadef26"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFornavndatadef25349/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25349",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverFornavn-datadef-25349/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349",
      "TypeName": "Tekst35repformat3",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverFornavndatadef25349.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFornavndatadef25349/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "35",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverFornavn-datadef-25349/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349.value : [1..1] Tekst35repformat3"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverFornavndatadef25349",
      "Name": "OppgavegiverFornavndatadef25349",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverFornavndatadef25349",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverFornavn-datadef-25349",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverFornavn-datadef-25349",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverFornavndatadef25349 : [0..1] OppgavegiverFornavndatadef25349"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverEtternavndatadef8770/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "8770",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverEtternavn-datadef-8770/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770",
      "TypeName": "Tekst35repformat3",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverEtternavndatadef8770.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverEtternavndatadef8770/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "35",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverEtternavn-datadef-8770/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770.value : [1..1] Tekst35repformat3"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverEtternavndatadef8770",
      "Name": "OppgavegiverEtternavndatadef8770",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverEtternavndatadef8770",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverEtternavn-datadef-8770",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverEtternavn-datadef-8770",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverEtternavndatadef8770 : [0..1] OppgavegiverEtternavndatadef8770"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverAdressedatadef69/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "69",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverAdresse-datadef-69/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69",
      "TypeName": "Tekst35repformat3",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverAdressedatadef69.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverAdressedatadef69/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "35",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverAdresse-datadef-69/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69.value : [1..1] Tekst35repformat3"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverAdressedatadef69",
      "Name": "OppgavegiverAdressedatadef69",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverAdressedatadef69",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverAdresse-datadef-69",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverAdresse-datadef-69",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverAdressedatadef69 : [0..1] OppgavegiverAdressedatadef69"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPostnummerdatadef6676/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "6676",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverPostnummer-datadef-6676/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676",
      "TypeName": "Tekst44BareTallrepformat10",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverPostnummerdatadef6676.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPostnummerdatadef6676/value",
      "Restrictions": {
        "length": {
          "Value": "4",
          "ErrortText": null
        },
        "pattern": {
          "Value": "[0-9]{4}",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverPostnummer-datadef-6676/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676.value : [1..1] Tekst44BareTallrepformat10"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverPostnummerdatadef6676",
      "Name": "OppgavegiverPostnummerdatadef6676",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPostnummerdatadef6676",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverPostnummer-datadef-6676",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverPostnummer-datadef-6676",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPostnummerdatadef6676 : [0..1] OppgavegiverPostnummerdatadef6676"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.orid": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.orid",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPoststeddatadef6677/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "6677",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverPoststed-datadef-6677/properties/orid",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.orid : [1..1] Integer"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.value": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.value",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677",
      "TypeName": "Tekst35repformat3",
      "Name": "value",
      "DataBindingName": "utfyllingAvSkjemagrp5809.persongrp5812.oppgavegiverPoststeddatadef6677.value",
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPoststeddatadef6677/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "35",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppgavegiverPoststed-datadef-6677/properties/value",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677.value : [1..1] Tekst35repformat3"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "TypeName": "OppgavegiverPoststeddatadef6677",
      "Name": "OppgavegiverPoststeddatadef6677",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812/OppgavegiverPoststeddatadef6677",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppgavegiverPoststed-datadef-6677",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Person-grp-5812/properties/OppgavegiverPoststed-datadef-6677",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812.OppgavegiverPoststeddatadef6677 : [0..1] OppgavegiverPoststeddatadef6677"
    },
    "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812",
      "ParentElement": "Skjema.UtfyllingAvSkjemagrp5809",
      "TypeName": "Persongrp5812",
      "Name": "Persongrp5812",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809/Persongrp5812",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Person-grp-5812",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/UtfyllingAvSkjema-grp-5809/properties/Person-grp-5812",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809.Persongrp5812 : [0..1] Persongrp5812"
    },
    "Skjema.UtfyllingAvSkjemagrp5809": {
      "ID": "Skjema.UtfyllingAvSkjemagrp5809",
      "ParentElement": "Skjema",
      "TypeName": "UtfyllingAvSkjemagrp5809",
      "Name": "UtfyllingAvSkjemagrp5809",
      "DataBindingName": null,
      "XPath": "/Skjema/UtfyllingAvSkjemagrp5809",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "UtfyllingAvSkjema-grp-5809",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/UtfyllingAvSkjema-grp-5809",
      "DisplayString": "Skjema.UtfyllingAvSkjemagrp5809 : [0..1] UtfyllingAvSkjemagrp5809"
    },
    "Skjema.Sokergrp5813.gruppeid": {
      "ID": "Skjema.Sokergrp5813.gruppeid",
      "ParentElement": "Skjema.Sokergrp5813",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5813",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5813/properties/gruppeid",
      "DisplayString": "Skjema.Sokergrp5813.gruppeid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.gruppeid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.gruppeid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5814",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/gruppeid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].gruppeid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/PersonFodselsnummerdatadef21488/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "21488",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/PersonFodselsnummer-datadef-21488/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].PersonFodselsnummerdatadef21488.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488",
      "TypeName": "Tekst1111Modulus11repformat18",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.personFodselsnummerdatadef21488.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/PersonFodselsnummerdatadef21488/value",
      "Restrictions": {
        "length": {
          "Value": "11",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "21488.PersonFodselsnummerdatadef21488.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/PersonFodselsnummer-datadef-21488/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].PersonFodselsnummerdatadef21488.value : [1..1] Tekst1111Modulus11repformat18"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.PersonFodselsnummerdatadef21488",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "PersonFodselsnummerdatadef21488",
      "Name": "PersonFodselsnummerdatadef21488",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/PersonFodselsnummerdatadef21488",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "21488.PersonFodselsnummerdatadef21488.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "PersonFodselsnummer-datadef-21488",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/PersonFodselsnummer-datadef-21488",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].PersonFodselsnummerdatadef21488 : [0..1] PersonFodselsnummerdatadef21488"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerOrganisasjonsnummerdatadef19105/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "19105",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerOrganisasjonsnummer-datadef-19105/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerOrganisasjonsnummerdatadef19105.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105",
      "TypeName": "Tekst99Modulus11repformat1",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerOrganisasjonsnummerdatadef19105.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerOrganisasjonsnummerdatadef19105/value",
      "Restrictions": {
        "length": {
          "Value": "9",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "19105.SokerOrganisasjonsnummerdatadef19105.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerOrganisasjonsnummer-datadef-19105/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerOrganisasjonsnummerdatadef19105.value : [1..1] Tekst99Modulus11repformat1"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerOrganisasjonsnummerdatadef19105",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerOrganisasjonsnummerdatadef19105",
      "Name": "SokerOrganisasjonsnummerdatadef19105",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerOrganisasjonsnummerdatadef19105",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "19105.SokerOrganisasjonsnummerdatadef19105.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerOrganisasjonsnummer-datadef-19105",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerOrganisasjonsnummer-datadef-19105",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerOrganisasjonsnummerdatadef19105 : [0..1] SokerOrganisasjonsnummerdatadef19105"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerForetakNavndatadef25392/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25392",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerForetakNavn-datadef-25392/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerForetakNavndatadef25392.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerForetakNavndatadef25392.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerForetakNavndatadef25392/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25392.SokerForetakNavndatadef25392.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerForetakNavn-datadef-25392/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerForetakNavndatadef25392.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerForetakNavndatadef25392",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerForetakNavndatadef25392",
      "Name": "SokerForetakNavndatadef25392",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerForetakNavndatadef25392",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25392.SokerForetakNavndatadef25392.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerForetakNavn-datadef-25392",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerForetakNavn-datadef-25392",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerForetakNavndatadef25392 : [0..1] SokerForetakNavndatadef25392"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerFornavndatadef25394/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25394",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerFornavn-datadef-25394/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerFornavndatadef25394.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerFornavndatadef25394.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerFornavndatadef25394/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25394.SokerFornavndatadef25394.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerFornavn-datadef-25394/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerFornavndatadef25394.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerFornavndatadef25394",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerFornavndatadef25394",
      "Name": "SokerFornavndatadef25394",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerFornavndatadef25394",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25394.SokerFornavndatadef25394.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerFornavn-datadef-25394",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerFornavn-datadef-25394",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerFornavndatadef25394 : [0..1] SokerFornavndatadef25394"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerEtternavndatadef25393/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25393",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerEtternavn-datadef-25393/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerEtternavndatadef25393.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerEtternavndatadef25393.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerEtternavndatadef25393/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25393.SokerEtternavndatadef25393.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerEtternavn-datadef-25393/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerEtternavndatadef25393.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerEtternavndatadef25393",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerEtternavndatadef25393",
      "Name": "SokerEtternavndatadef25393",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerEtternavndatadef25393",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25393.SokerEtternavndatadef25393.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerEtternavn-datadef-25393",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerEtternavn-datadef-25393",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerEtternavndatadef25393 : [0..1] SokerEtternavndatadef25393"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerAdressedatadef25395/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25395",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerAdresse-datadef-25395/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerAdressedatadef25395.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerAdressedatadef25395.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerAdressedatadef25395/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25395.SokerAdressedatadef25395.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerAdresse-datadef-25395/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerAdressedatadef25395.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerAdressedatadef25395",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerAdressedatadef25395",
      "Name": "SokerAdressedatadef25395",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerAdressedatadef25395",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25395.SokerAdressedatadef25395.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerAdresse-datadef-25395",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerAdresse-datadef-25395",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerAdressedatadef25395 : [0..1] SokerAdressedatadef25395"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPostnummerdatadef25396/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25396",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerPostnummer-datadef-25396/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPostnummerdatadef25396.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396",
      "TypeName": "Tekst150repformat13",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerPostnummerdatadef25396.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPostnummerdatadef25396/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "150",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25396.SokerPostnummerdatadef25396.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerPostnummer-datadef-25396/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPostnummerdatadef25396.value : [1..1] Tekst150repformat13"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPostnummerdatadef25396",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerPostnummerdatadef25396",
      "Name": "SokerPostnummerdatadef25396",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPostnummerdatadef25396",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25396.SokerPostnummerdatadef25396.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerPostnummer-datadef-25396",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerPostnummer-datadef-25396",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPostnummerdatadef25396 : [0..1] SokerPostnummerdatadef25396"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPoststeddatadef25397/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25397",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerPoststed-datadef-25397/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPoststeddatadef25397.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerPoststeddatadef25397.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPoststeddatadef25397/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25397.SokerPoststeddatadef25397.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerPoststed-datadef-25397/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPoststeddatadef25397.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerPoststeddatadef25397",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerPoststeddatadef25397",
      "Name": "SokerPoststeddatadef25397",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerPoststeddatadef25397",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25397.SokerPoststeddatadef25397.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerPoststed-datadef-25397",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerPoststed-datadef-25397",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerPoststeddatadef25397 : [0..1] SokerPoststeddatadef25397"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerLanddatadef25386/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25386",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerLand-datadef-25386/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerLanddatadef25386.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386",
      "TypeName": "Tekst22repformat484",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerLanddatadef25386.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerLanddatadef25386/value",
      "Restrictions": {
        "length": {
          "Value": "2",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25386.SokerLanddatadef25386.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerLand-datadef-25386/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerLanddatadef25386.value : [1..1] Tekst22repformat484"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerLanddatadef25386",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerLanddatadef25386",
      "Name": "SokerLanddatadef25386",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerLanddatadef25386",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25386.SokerLanddatadef25386.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerLand-datadef-25386",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerLand-datadef-25386",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerLanddatadef25386 : [0..1] SokerLanddatadef25386"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384.orid": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384.orid",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerKundenummerdatadef25384/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25384",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKundenummer-datadef-25384/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerKundenummerdatadef25384.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384.value": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384.value",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384",
      "TypeName": "PosHeltall310repformat483",
      "Name": "value",
      "DataBindingName": "sokergrp5813.opplysningerOmSokergrp5814.sokerKundenummerdatadef25384.value",
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerKundenummerdatadef25384/value",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        },
        "maximum": {
          "Value": "9999999999",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "PositiveInteger",
      "Texts": {
        "Label": "25384.SokerKundenummerdatadef25384.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKundenummer-datadef-25384/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerKundenummerdatadef25384.value : [1..1] PosHeltall310repformat483"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814.SokerKundenummerdatadef25384",
      "ParentElement": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "TypeName": "SokerKundenummerdatadef25384",
      "Name": "SokerKundenummerdatadef25384",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814/SokerKundenummerdatadef25384",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25384.SokerKundenummerdatadef25384.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKundenummer-datadef-25384",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OpplysningerOmSoker-grp-5814/properties/SokerKundenummer-datadef-25384",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814[*].SokerKundenummerdatadef25384 : [0..1] SokerKundenummerdatadef25384"
    },
    "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814": {
      "ID": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814",
      "ParentElement": "Skjema.Sokergrp5813",
      "TypeName": "OpplysningerOmSokergrp5814",
      "Name": "OpplysningerOmSokergrp5814",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/OpplysningerOmSokergrp5814",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 99,
      "MinOccurs": 0,
      "XName": "OpplysningerOmSoker-grp-5814",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5813/properties/OpplysningerOmSoker-grp-5814",
      "DisplayString": "Skjema.Sokergrp5813.OpplysningerOmSokergrp5814 : [0..99] OpplysningerOmSokergrp5814"
    },
    "Skjema.Sokergrp5813.AntallArsverkgrp5815.gruppeid": {
      "ID": "Skjema.Sokergrp5813.AntallArsverkgrp5815.gruppeid",
      "ParentElement": "Skjema.Sokergrp5813.AntallArsverkgrp5815",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/AntallArsverkgrp5815/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5815",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AntallArsverk-grp-5815/properties/gruppeid",
      "DisplayString": "Skjema.Sokergrp5813.AntallArsverkgrp5815.gruppeid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.orid": {
      "ID": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.orid",
      "ParentElement": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/AntallArsverkgrp5815/SokerArsverk20EllerFarredatadef25532/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25532",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerArsverk20EllerFarre-datadef-25532/properties/orid",
      "DisplayString": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.orid : [1..1] Integer"
    },
    "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.value": {
      "ID": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.value",
      "ParentElement": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "sokergrp5813.antallArsverkgrp5815.sokerArsverk20EllerFarredatadef25532.value",
      "XPath": "/Skjema/Sokergrp5813/AntallArsverkgrp5815/SokerArsverk20EllerFarredatadef25532/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25532.SokerArsverk20EllerFarredatadef25532.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerArsverk20EllerFarre-datadef-25532/properties/value",
      "DisplayString": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532": {
      "ID": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532",
      "ParentElement": "Skjema.Sokergrp5813.AntallArsverkgrp5815",
      "TypeName": "SokerArsverk20EllerFarredatadef25532",
      "Name": "SokerArsverk20EllerFarredatadef25532",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/AntallArsverkgrp5815/SokerArsverk20EllerFarredatadef25532",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25532.SokerArsverk20EllerFarredatadef25532.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerArsverk20EllerFarre-datadef-25532",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AntallArsverk-grp-5815/properties/SokerArsverk20EllerFarre-datadef-25532",
      "DisplayString": "Skjema.Sokergrp5813.AntallArsverkgrp5815.SokerArsverk20EllerFarredatadef25532 : [0..1] SokerArsverk20EllerFarredatadef25532"
    },
    "Skjema.Sokergrp5813.AntallArsverkgrp5815": {
      "ID": "Skjema.Sokergrp5813.AntallArsverkgrp5815",
      "ParentElement": "Skjema.Sokergrp5813",
      "TypeName": "AntallArsverkgrp5815",
      "Name": "AntallArsverkgrp5815",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813/AntallArsverkgrp5815",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "AntallArsverk-grp-5815",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5813/properties/AntallArsverk-grp-5815",
      "DisplayString": "Skjema.Sokergrp5813.AntallArsverkgrp5815 : [0..1] AntallArsverkgrp5815"
    },
    "Skjema.Sokergrp5813": {
      "ID": "Skjema.Sokergrp5813",
      "ParentElement": "Skjema",
      "TypeName": "Sokergrp5813",
      "Name": "Sokergrp5813",
      "DataBindingName": null,
      "XPath": "/Skjema/Sokergrp5813",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Soker-grp-5813",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Soker-grp-5813",
      "DisplayString": "Skjema.Sokergrp5813 : [0..1] Sokergrp5813"
    },
    "Skjema.Oppfinnergrp5816.gruppeid": {
      "ID": "Skjema.Oppfinnergrp5816.gruppeid",
      "ParentElement": "Skjema.Oppfinnergrp5816",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5816",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Oppfinner-grp-5816/properties/gruppeid",
      "DisplayString": "Skjema.Oppfinnergrp5816.gruppeid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.gruppeid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.gruppeid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5817",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/gruppeid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].gruppeid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFodselsnummerdatadef25524/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25524",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerFodselsnummer-datadef-25524/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFodselsnummerdatadef25524.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524",
      "TypeName": "Tekst1111Modulus11repformat18",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerFodselsnummerdatadef25524.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFodselsnummerdatadef25524/value",
      "Restrictions": {
        "length": {
          "Value": "11",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25524.OppfinnerFodselsnummerdatadef25524.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerFodselsnummer-datadef-25524/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFodselsnummerdatadef25524.value : [1..1] Tekst1111Modulus11repformat18"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFodselsnummerdatadef25524",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerFodselsnummerdatadef25524",
      "Name": "OppfinnerFodselsnummerdatadef25524",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFodselsnummerdatadef25524",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25524.OppfinnerFodselsnummerdatadef25524.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerFodselsnummer-datadef-25524",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerFodselsnummer-datadef-25524",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFodselsnummerdatadef25524 : [0..1] OppfinnerFodselsnummerdatadef25524"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFornavndatadef25525/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25525",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerFornavn-datadef-25525/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFornavndatadef25525.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerFornavndatadef25525.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFornavndatadef25525/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25525.OppfinnerFornavndatadef25525.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerFornavn-datadef-25525/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFornavndatadef25525.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerFornavndatadef25525",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerFornavndatadef25525",
      "Name": "OppfinnerFornavndatadef25525",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerFornavndatadef25525",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25525.OppfinnerFornavndatadef25525.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerFornavn-datadef-25525",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerFornavn-datadef-25525",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerFornavndatadef25525 : [0..1] OppfinnerFornavndatadef25525"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerEtternavndatadef25526/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25526",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerEtternavn-datadef-25526/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerEtternavndatadef25526.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerEtternavndatadef25526.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerEtternavndatadef25526/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25526.OppfinnerEtternavndatadef25526.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerEtternavn-datadef-25526/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerEtternavndatadef25526.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerEtternavndatadef25526",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerEtternavndatadef25526",
      "Name": "OppfinnerEtternavndatadef25526",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerEtternavndatadef25526",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25526.OppfinnerEtternavndatadef25526.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerEtternavn-datadef-25526",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerEtternavn-datadef-25526",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerEtternavndatadef25526 : [0..1] OppfinnerEtternavndatadef25526"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerAdressedatadef25527/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25527",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerAdresse-datadef-25527/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerAdressedatadef25527.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerAdressedatadef25527.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerAdressedatadef25527/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25527.OppfinnerAdressedatadef25527.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerAdresse-datadef-25527/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerAdressedatadef25527.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerAdressedatadef25527",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerAdressedatadef25527",
      "Name": "OppfinnerAdressedatadef25527",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerAdressedatadef25527",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25527.OppfinnerAdressedatadef25527.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerAdresse-datadef-25527",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerAdresse-datadef-25527",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerAdressedatadef25527 : [0..1] OppfinnerAdressedatadef25527"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPostnummerdatadef25529/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25529",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerPostnummer-datadef-25529/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPostnummerdatadef25529.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529",
      "TypeName": "Tekst150repformat13",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerPostnummerdatadef25529.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPostnummerdatadef25529/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "150",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25529.OppfinnerPostnummerdatadef25529.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerPostnummer-datadef-25529/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPostnummerdatadef25529.value : [1..1] Tekst150repformat13"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPostnummerdatadef25529",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerPostnummerdatadef25529",
      "Name": "OppfinnerPostnummerdatadef25529",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPostnummerdatadef25529",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25529.OppfinnerPostnummerdatadef25529.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerPostnummer-datadef-25529",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerPostnummer-datadef-25529",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPostnummerdatadef25529 : [0..1] OppfinnerPostnummerdatadef25529"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPoststeddatadef25528/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25528",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerPoststed-datadef-25528/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPoststeddatadef25528.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerPoststeddatadef25528.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPoststeddatadef25528/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25528.OppfinnerPoststeddatadef25528.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerPoststed-datadef-25528/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPoststeddatadef25528.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerPoststeddatadef25528",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerPoststeddatadef25528",
      "Name": "OppfinnerPoststeddatadef25528",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerPoststeddatadef25528",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25528.OppfinnerPoststeddatadef25528.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerPoststed-datadef-25528",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerPoststed-datadef-25528",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerPoststeddatadef25528 : [0..1] OppfinnerPoststeddatadef25528"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerLanddatadef25530/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25530",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerLand-datadef-25530/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerLanddatadef25530.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530",
      "TypeName": "Tekst22repformat484",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerLanddatadef25530.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerLanddatadef25530/value",
      "Restrictions": {
        "length": {
          "Value": "2",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25530.OppfinnerLanddatadef25530.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerLand-datadef-25530/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerLanddatadef25530.value : [1..1] Tekst22repformat484"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerLanddatadef25530",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerLanddatadef25530",
      "Name": "OppfinnerLanddatadef25530",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerLanddatadef25530",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25530.OppfinnerLanddatadef25530.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerLand-datadef-25530",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerLand-datadef-25530",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerLanddatadef25530 : [0..1] OppfinnerLanddatadef25530"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531.orid": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531.orid",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerKundenummerdatadef25531/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25531",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerKundenummer-datadef-25531/properties/orid",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerKundenummerdatadef25531.orid : [1..1] Integer"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531.value": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531.value",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531",
      "TypeName": "PosHeltall310repformat483",
      "Name": "value",
      "DataBindingName": "oppfinnergrp5816.informasjonOmOppfinnergrp5817.oppfinnerKundenummerdatadef25531.value",
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerKundenummerdatadef25531/value",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        },
        "maximum": {
          "Value": "9999999999",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "PositiveInteger",
      "Texts": {
        "Label": "25531.OppfinnerKundenummerdatadef25531.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/OppfinnerKundenummer-datadef-25531/properties/value",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerKundenummerdatadef25531.value : [1..1] PosHeltall310repformat483"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817.OppfinnerKundenummerdatadef25531",
      "ParentElement": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "TypeName": "OppfinnerKundenummerdatadef25531",
      "Name": "OppfinnerKundenummerdatadef25531",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817/OppfinnerKundenummerdatadef25531",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25531.OppfinnerKundenummerdatadef25531.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "OppfinnerKundenummer-datadef-25531",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmOppfinner-grp-5817/properties/OppfinnerKundenummer-datadef-25531",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817[*].OppfinnerKundenummerdatadef25531 : [0..1] OppfinnerKundenummerdatadef25531"
    },
    "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817": {
      "ID": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817",
      "ParentElement": "Skjema.Oppfinnergrp5816",
      "TypeName": "InformasjonOmOppfinnergrp5817",
      "Name": "InformasjonOmOppfinnergrp5817",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816/InformasjonOmOppfinnergrp5817",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 99,
      "MinOccurs": 0,
      "XName": "InformasjonOmOppfinner-grp-5817",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Oppfinner-grp-5816/properties/InformasjonOmOppfinner-grp-5817",
      "DisplayString": "Skjema.Oppfinnergrp5816.InformasjonOmOppfinnergrp5817 : [0..99] InformasjonOmOppfinnergrp5817"
    },
    "Skjema.Oppfinnergrp5816": {
      "ID": "Skjema.Oppfinnergrp5816",
      "ParentElement": "Skjema",
      "TypeName": "Oppfinnergrp5816",
      "Name": "Oppfinnergrp5816",
      "DataBindingName": null,
      "XPath": "/Skjema/Oppfinnergrp5816",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Oppfinner-grp-5816",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Oppfinner-grp-5816",
      "DisplayString": "Skjema.Oppfinnergrp5816 : [0..1] Oppfinnergrp5816"
    },
    "Skjema.Fullmektiggrp5818.gruppeid": {
      "ID": "Skjema.Fullmektiggrp5818.gruppeid",
      "ParentElement": "Skjema.Fullmektiggrp5818",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5818",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5818/properties/gruppeid",
      "DisplayString": "Skjema.Fullmektiggrp5818.gruppeid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.orid": {
      "ID": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/FullmaktshaverRepresentantSokerdatadef25533/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25533",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverRepresentantSoker-datadef-25533/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.value": {
      "ID": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.fullmaktshaverRepresentantSokerdatadef25533.value",
      "XPath": "/Skjema/Fullmektiggrp5818/FullmaktshaverRepresentantSokerdatadef25533/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25533.FullmaktshaverRepresentantSokerdatadef25533.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverRepresentantSoker-datadef-25533/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533": {
      "ID": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533",
      "ParentElement": "Skjema.Fullmektiggrp5818",
      "TypeName": "FullmaktshaverRepresentantSokerdatadef25533",
      "Name": "FullmaktshaverRepresentantSokerdatadef25533",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/FullmaktshaverRepresentantSokerdatadef25533",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25533.FullmaktshaverRepresentantSokerdatadef25533.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverRepresentantSoker-datadef-25533",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5818/properties/FullmaktshaverRepresentantSoker-datadef-25533",
      "DisplayString": "Skjema.Fullmektiggrp5818.FullmaktshaverRepresentantSokerdatadef25533 : [0..1] FullmaktshaverRepresentantSokerdatadef25533"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.gruppeid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.gruppeid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5819",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/gruppeid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.gruppeid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFodselsnummerdatadef2989/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "2989",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverFodselsnummer-datadef-2989/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989",
      "TypeName": "Tekst1111Modulus11repformat18",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverFodselsnummerdatadef2989.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFodselsnummerdatadef2989/value",
      "Restrictions": {
        "length": {
          "Value": "11",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "2989.FullmaktshaverFodselsnummerdatadef2989.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverFodselsnummer-datadef-2989/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989.value : [1..1] Tekst1111Modulus11repformat18"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverFodselsnummerdatadef2989",
      "Name": "FullmaktshaverFodselsnummerdatadef2989",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFodselsnummerdatadef2989",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "2989.FullmaktshaverFodselsnummerdatadef2989.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverFodselsnummer-datadef-2989",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverFodselsnummer-datadef-2989",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFodselsnummerdatadef2989 : [0..1] FullmaktshaverFodselsnummerdatadef2989"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverOrganisasjonsnummerdatadef25358/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25358",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverOrganisasjonsnummer-datadef-25358/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358",
      "TypeName": "Tekst99Modulus11repformat1",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverOrganisasjonsnummerdatadef25358.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverOrganisasjonsnummerdatadef25358/value",
      "Restrictions": {
        "length": {
          "Value": "9",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25358.FullmaktshaverOrganisasjonsnummerdatadef25358.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverOrganisasjonsnummer-datadef-25358/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358.value : [1..1] Tekst99Modulus11repformat1"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverOrganisasjonsnummerdatadef25358",
      "Name": "FullmaktshaverOrganisasjonsnummerdatadef25358",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverOrganisasjonsnummerdatadef25358",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25358.FullmaktshaverOrganisasjonsnummerdatadef25358.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverOrganisasjonsnummer-datadef-25358",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverOrganisasjonsnummer-datadef-25358",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverOrganisasjonsnummerdatadef25358 : [0..1] FullmaktshaverOrganisasjonsnummerdatadef25358"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverForetakNavndatadef25359/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25359",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverForetakNavn-datadef-25359/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverForetakNavndatadef25359.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverForetakNavndatadef25359/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25359.FullmaktshaverForetakNavndatadef25359.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverForetakNavn-datadef-25359/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverForetakNavndatadef25359",
      "Name": "FullmaktshaverForetakNavndatadef25359",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverForetakNavndatadef25359",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25359.FullmaktshaverForetakNavndatadef25359.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverForetakNavn-datadef-25359",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverForetakNavn-datadef-25359",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverForetakNavndatadef25359 : [0..1] FullmaktshaverForetakNavndatadef25359"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFornavndatadef25360/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25360",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverFornavn-datadef-25360/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverFornavndatadef25360.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFornavndatadef25360/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25360.FullmaktshaverFornavndatadef25360.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverFornavn-datadef-25360/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverFornavndatadef25360",
      "Name": "FullmaktshaverFornavndatadef25360",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverFornavndatadef25360",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25360.FullmaktshaverFornavndatadef25360.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverFornavn-datadef-25360",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverFornavn-datadef-25360",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverFornavndatadef25360 : [0..1] FullmaktshaverFornavndatadef25360"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverEtternavndatadef25361/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25361",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverEtternavn-datadef-25361/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverEtternavndatadef25361.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverEtternavndatadef25361/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25361.FullmaktshaverEtternavndatadef25361.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverEtternavn-datadef-25361/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverEtternavndatadef25361",
      "Name": "FullmaktshaverEtternavndatadef25361",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverEtternavndatadef25361",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25361.FullmaktshaverEtternavndatadef25361.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverEtternavn-datadef-25361",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverEtternavn-datadef-25361",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverEtternavndatadef25361 : [0..1] FullmaktshaverEtternavndatadef25361"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverAdressedatadef25416/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25416",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverAdresse-datadef-25416/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverAdressedatadef25416.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverAdressedatadef25416/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25416.FullmaktshaverAdressedatadef25416.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverAdresse-datadef-25416/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverAdressedatadef25416",
      "Name": "FullmaktshaverAdressedatadef25416",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverAdressedatadef25416",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25416.FullmaktshaverAdressedatadef25416.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverAdresse-datadef-25416",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverAdresse-datadef-25416",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverAdressedatadef25416 : [0..1] FullmaktshaverAdressedatadef25416"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPostnummerdatadef25417/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25417",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverPostnummer-datadef-25417/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417",
      "TypeName": "Tekst15repformat61",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverPostnummerdatadef25417.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPostnummerdatadef25417/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "15",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25417.FullmaktshaverPostnummerdatadef25417.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverPostnummer-datadef-25417/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417.value : [1..1] Tekst15repformat61"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverPostnummerdatadef25417",
      "Name": "FullmaktshaverPostnummerdatadef25417",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPostnummerdatadef25417",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25417.FullmaktshaverPostnummerdatadef25417.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverPostnummer-datadef-25417",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverPostnummer-datadef-25417",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPostnummerdatadef25417 : [0..1] FullmaktshaverPostnummerdatadef25417"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPoststeddatadef25418/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25418",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverPoststed-datadef-25418/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418",
      "TypeName": "Tekst30repformat40",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverPoststeddatadef25418.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPoststeddatadef25418/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "30",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25418.FullmaktshaverPoststeddatadef25418.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverPoststed-datadef-25418/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418.value : [1..1] Tekst30repformat40"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverPoststeddatadef25418",
      "Name": "FullmaktshaverPoststeddatadef25418",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverPoststeddatadef25418",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25418.FullmaktshaverPoststeddatadef25418.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverPoststed-datadef-25418",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverPoststed-datadef-25418",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverPoststeddatadef25418 : [0..1] FullmaktshaverPoststeddatadef25418"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverLanddatadef5033/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "5033",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverLand-datadef-5033/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033",
      "TypeName": "Tekst22repformat484",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverLanddatadef5033.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverLanddatadef5033/value",
      "Restrictions": {
        "length": {
          "Value": "2",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "5033.FullmaktshaverLanddatadef5033.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverLand-datadef-5033/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033.value : [1..1] Tekst22repformat484"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverLanddatadef5033",
      "Name": "FullmaktshaverLanddatadef5033",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverLanddatadef5033",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "5033.FullmaktshaverLanddatadef5033.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverLand-datadef-5033",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverLand-datadef-5033",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverLanddatadef5033 : [0..1] FullmaktshaverLanddatadef5033"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.orid": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.orid",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverKundenummerdatadef25387/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25387",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverKundenummer-datadef-25387/properties/orid",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.orid : [1..1] Integer"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.value": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.value",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387",
      "TypeName": "PosHeltall310repformat483",
      "Name": "value",
      "DataBindingName": "fullmektiggrp5818.informasjonOmFullmektiggrp5819.fullmaktshaverKundenummerdatadef25387.value",
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverKundenummerdatadef25387/value",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        },
        "maximum": {
          "Value": "9999999999",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "PositiveInteger",
      "Texts": {
        "Label": "25387.FullmaktshaverKundenummerdatadef25387.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/FullmaktshaverKundenummer-datadef-25387/properties/value",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387.value : [1..1] PosHeltall310repformat483"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387",
      "ParentElement": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "TypeName": "FullmaktshaverKundenummerdatadef25387",
      "Name": "FullmaktshaverKundenummerdatadef25387",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819/FullmaktshaverKundenummerdatadef25387",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25387.FullmaktshaverKundenummerdatadef25387.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "FullmaktshaverKundenummer-datadef-25387",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmFullmektig-grp-5819/properties/FullmaktshaverKundenummer-datadef-25387",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819.FullmaktshaverKundenummerdatadef25387 : [0..1] FullmaktshaverKundenummerdatadef25387"
    },
    "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819": {
      "ID": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819",
      "ParentElement": "Skjema.Fullmektiggrp5818",
      "TypeName": "InformasjonOmFullmektiggrp5819",
      "Name": "InformasjonOmFullmektiggrp5819",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818/InformasjonOmFullmektiggrp5819",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "InformasjonOmFullmektig-grp-5819",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5818/properties/InformasjonOmFullmektig-grp-5819",
      "DisplayString": "Skjema.Fullmektiggrp5818.InformasjonOmFullmektiggrp5819 : [0..1] InformasjonOmFullmektiggrp5819"
    },
    "Skjema.Fullmektiggrp5818": {
      "ID": "Skjema.Fullmektiggrp5818",
      "ParentElement": "Skjema",
      "TypeName": "Fullmektiggrp5818",
      "Name": "Fullmektiggrp5818",
      "DataBindingName": null,
      "XPath": "/Skjema/Fullmektiggrp5818",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Fullmektig-grp-5818",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Fullmektig-grp-5818",
      "DisplayString": "Skjema.Fullmektiggrp5818 : [0..1] Fullmektiggrp5818"
    },
    "Skjema.Kontaktinformasjongrp5820.gruppeid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.gruppeid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5820",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Kontaktinformasjon-grp-5820/properties/gruppeid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.gruppeid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.gruppeid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.gruppeid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5821",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/gruppeid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.gruppeid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonNavndatadef25390/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25390",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonNavn-datadef-25390/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.sokergrp5821.sokerKontaktpersonNavndatadef25390.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonNavndatadef25390/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25390.SokerKontaktpersonNavndatadef25390.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonNavn-datadef-25390/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "SokerKontaktpersonNavndatadef25390",
      "Name": "SokerKontaktpersonNavndatadef25390",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonNavndatadef25390",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25390.SokerKontaktpersonNavndatadef25390.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKontaktpersonNavn-datadef-25390",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/SokerKontaktpersonNavn-datadef-25390",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonNavndatadef25390 : [0..1] SokerKontaktpersonNavndatadef25390"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonTelefonnummerdatadef25391/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25391",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonTelefonnummer-datadef-25391/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391",
      "TypeName": "Tekst15repformat61",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.sokergrp5821.sokerKontaktpersonTelefonnummerdatadef25391.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonTelefonnummerdatadef25391/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "15",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25391.SokerKontaktpersonTelefonnummerdatadef25391.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonTelefonnummer-datadef-25391/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391.value : [1..1] Tekst15repformat61"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "SokerKontaktpersonTelefonnummerdatadef25391",
      "Name": "SokerKontaktpersonTelefonnummerdatadef25391",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonTelefonnummerdatadef25391",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25391.SokerKontaktpersonTelefonnummerdatadef25391.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKontaktpersonTelefonnummer-datadef-25391",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/SokerKontaktpersonTelefonnummer-datadef-25391",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonTelefonnummerdatadef25391 : [0..1] SokerKontaktpersonTelefonnummerdatadef25391"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonMobiltelefonnummerdatadef32870/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "32870",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonMobiltelefonnummer-datadef-32870/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "TypeName": "Tekst15repformat61",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.sokergrp5821.sokerKontaktpersonMobiltelefonnummerdatadef32870.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonMobiltelefonnummerdatadef32870/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "15",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "32870.SokerKontaktpersonMobiltelefonnummerdatadef32870.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonMobiltelefonnummer-datadef-32870/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870.value : [1..1] Tekst15repformat61"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "Name": "SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonMobiltelefonnummerdatadef32870",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "32870.SokerKontaktpersonMobiltelefonnummerdatadef32870.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKontaktpersonMobiltelefonnummer-datadef-32870",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/SokerKontaktpersonMobiltelefonnummer-datadef-32870",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonMobiltelefonnummerdatadef32870 : [0..1] SokerKontaktpersonMobiltelefonnummerdatadef32870"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonEPostdatadef32871/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "32871",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonEPost-datadef-32871/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871",
      "TypeName": "Tekst100repformat48",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.sokergrp5821.sokerKontaktpersonEPostdatadef32871.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonEPostdatadef32871/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "100",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "32871.SokerKontaktpersonEPostdatadef32871.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonEPost-datadef-32871/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871.value : [1..1] Tekst100repformat48"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "SokerKontaktpersonEPostdatadef32871",
      "Name": "SokerKontaktpersonEPostdatadef32871",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonEPostdatadef32871",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "32871.SokerKontaktpersonEPostdatadef32871.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKontaktpersonEPost-datadef-32871",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/SokerKontaktpersonEPost-datadef-32871",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonEPostdatadef32871 : [0..1] SokerKontaktpersonEPostdatadef32871"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonReferansedatadef25389/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25389",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonReferanse-datadef-25389/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389",
      "TypeName": "Tekst30repformat40",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.sokergrp5821.sokerKontaktpersonReferansedatadef25389.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonReferansedatadef25389/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "30",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25389.SokerKontaktpersonReferansedatadef25389.Label",
        "PlaceHolder": "25389.SokerKontaktpersonReferansedatadef25389.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SokerKontaktpersonReferanse-datadef-25389/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389.value : [1..1] Tekst30repformat40"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "TypeName": "SokerKontaktpersonReferansedatadef25389",
      "Name": "SokerKontaktpersonReferansedatadef25389",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821/SokerKontaktpersonReferansedatadef25389",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25389.SokerKontaktpersonReferansedatadef25389.Label",
        "PlaceHolder": "25389.SokerKontaktpersonReferansedatadef25389.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SokerKontaktpersonReferanse-datadef-25389",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soker-grp-5821/properties/SokerKontaktpersonReferanse-datadef-25389",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821.SokerKontaktpersonReferansedatadef25389 : [0..1] SokerKontaktpersonReferansedatadef25389"
    },
    "Skjema.Kontaktinformasjongrp5820.Sokergrp5821": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820",
      "TypeName": "Sokergrp5821",
      "Name": "Sokergrp5821",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Sokergrp5821",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Soker-grp-5821",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Kontaktinformasjon-grp-5820/properties/Soker-grp-5821",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Sokergrp5821 : [0..1] Sokergrp5821"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.gruppeid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.gruppeid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5822",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/gruppeid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.gruppeid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonNavndatadef2/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "2",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonNavn-datadef-2/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2",
      "TypeName": "Tekst150repformat13",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.fullmektiggrp5822.kontaktpersonNavndatadef2.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonNavndatadef2/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "150",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "2.KontaktpersonNavndatadef2.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonNavn-datadef-2/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2.value : [1..1] Tekst150repformat13"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "KontaktpersonNavndatadef2",
      "Name": "KontaktpersonNavndatadef2",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonNavndatadef2",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "2.KontaktpersonNavndatadef2.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "KontaktpersonNavn-datadef-2",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/KontaktpersonNavn-datadef-2",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonNavndatadef2 : [0..1] KontaktpersonNavndatadef2"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonTelefonnummerdatadef3/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "3",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonTelefonnummer-datadef-3/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3",
      "TypeName": "Tekst13repformat12",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.fullmektiggrp5822.kontaktpersonTelefonnummerdatadef3.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonTelefonnummerdatadef3/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "13",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "3.KontaktpersonTelefonnummerdatadef3.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonTelefonnummer-datadef-3/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3.value : [1..1] Tekst13repformat12"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "KontaktpersonTelefonnummerdatadef3",
      "Name": "KontaktpersonTelefonnummerdatadef3",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonTelefonnummerdatadef3",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "3.KontaktpersonTelefonnummerdatadef3.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "KontaktpersonTelefonnummer-datadef-3",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/KontaktpersonTelefonnummer-datadef-3",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonTelefonnummerdatadef3 : [0..1] KontaktpersonTelefonnummerdatadef3"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonMobiltelefonnummerdatadef7626/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "7626",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonMobiltelefonnummer-datadef-7626/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626",
      "TypeName": "Tekst15repformat61",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.fullmektiggrp5822.kontaktpersonMobiltelefonnummerdatadef7626.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonMobiltelefonnummerdatadef7626/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "15",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "7626.KontaktpersonMobiltelefonnummerdatadef7626.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonMobiltelefonnummer-datadef-7626/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626.value : [1..1] Tekst15repformat61"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "KontaktpersonMobiltelefonnummerdatadef7626",
      "Name": "KontaktpersonMobiltelefonnummerdatadef7626",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonMobiltelefonnummerdatadef7626",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "7626.KontaktpersonMobiltelefonnummerdatadef7626.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "KontaktpersonMobiltelefonnummer-datadef-7626",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/KontaktpersonMobiltelefonnummer-datadef-7626",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonMobiltelefonnummerdatadef7626 : [0..1] KontaktpersonMobiltelefonnummerdatadef7626"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonEPostdatadef2876/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "2876",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonEPost-datadef-2876/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876",
      "TypeName": "Tekst100repformat48",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.fullmektiggrp5822.kontaktpersonEPostdatadef2876.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonEPostdatadef2876/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "100",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "2876.KontaktpersonEPostdatadef2876.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonEPost-datadef-2876/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876.value : [1..1] Tekst100repformat48"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "KontaktpersonEPostdatadef2876",
      "Name": "KontaktpersonEPostdatadef2876",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonEPostdatadef2876",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "2876.KontaktpersonEPostdatadef2876.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "KontaktpersonEPost-datadef-2876",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/KontaktpersonEPost-datadef-2876",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonEPostdatadef2876 : [0..1] KontaktpersonEPostdatadef2876"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.orid": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.orid",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonReferansedatadef25351/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25351",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonReferanse-datadef-25351/properties/orid",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.orid : [1..1] Integer"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.value": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.value",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351",
      "TypeName": "Tekst30repformat40",
      "Name": "value",
      "DataBindingName": "kontaktinformasjongrp5820.fullmektiggrp5822.kontaktpersonReferansedatadef25351.value",
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonReferansedatadef25351/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "30",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25351.KontaktpersonReferansedatadef25351.Label",
        "PlaceHolder": "25351.KontaktpersonReferansedatadef25351.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/KontaktpersonReferanse-datadef-25351/properties/value",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351.value : [1..1] Tekst30repformat40"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "TypeName": "KontaktpersonReferansedatadef25351",
      "Name": "KontaktpersonReferansedatadef25351",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822/KontaktpersonReferansedatadef25351",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25351.KontaktpersonReferansedatadef25351.Label",
        "PlaceHolder": "25351.KontaktpersonReferansedatadef25351.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "KontaktpersonReferanse-datadef-25351",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Fullmektig-grp-5822/properties/KontaktpersonReferanse-datadef-25351",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822.KontaktpersonReferansedatadef25351 : [0..1] KontaktpersonReferansedatadef25351"
    },
    "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822": {
      "ID": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822",
      "ParentElement": "Skjema.Kontaktinformasjongrp5820",
      "TypeName": "Fullmektiggrp5822",
      "Name": "Fullmektiggrp5822",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820/Fullmektiggrp5822",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Fullmektig-grp-5822",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Kontaktinformasjon-grp-5820/properties/Fullmektig-grp-5822",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820.Fullmektiggrp5822 : [0..1] Fullmektiggrp5822"
    },
    "Skjema.Kontaktinformasjongrp5820": {
      "ID": "Skjema.Kontaktinformasjongrp5820",
      "ParentElement": "Skjema",
      "TypeName": "Kontaktinformasjongrp5820",
      "Name": "Kontaktinformasjongrp5820",
      "DataBindingName": null,
      "XPath": "/Skjema/Kontaktinformasjongrp5820",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Kontaktinformasjon-grp-5820",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Kontaktinformasjon-grp-5820",
      "DisplayString": "Skjema.Kontaktinformasjongrp5820 : [0..1] Kontaktinformasjongrp5820"
    },
    "Skjema.Soknadgrp5823.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5823",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5824",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadenOmfatter-grp-5824/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.orid": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.orid",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadTitteldatadef25534/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25534",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadTittel-datadef-25534/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.value": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.value",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.soknadenOmfattergrp5824.soknadTitteldatadef25534.value",
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadTitteldatadef25534/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25534.SoknadTitteldatadef25534.Label",
        "Help": "25534.SoknadTitteldatadef25534.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadTittel-datadef-25534/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824",
      "TypeName": "SoknadTitteldatadef25534",
      "Name": "SoknadTitteldatadef25534",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadTitteldatadef25534",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25534.SoknadTitteldatadef25534.Label",
        "Help": "25534.SoknadTitteldatadef25534.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "SoknadTittel-datadef-25534",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadenOmfatter-grp-5824/properties/SoknadTittel-datadef-25534",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadTitteldatadef25534 : [1..1] SoknadTitteldatadef25534"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.orid": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.orid",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentVedleggdatadef25536/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25536",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentVedlegg-datadef-25536/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.value": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.value",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536",
      "TypeName": "KodelisteFlereValg4VedleggPatentsoknadrepformat490",
      "Name": "value",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentVedleggdatadef25536/value",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25536.SoknadPatentVedleggdatadef25536.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentVedlegg-datadef-25536/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536.value : [1..1] KodelisteFlereValg4VedleggPatentsoknadrepformat490"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824",
      "TypeName": "SoknadPatentVedleggdatadef25536",
      "Name": "SoknadPatentVedleggdatadef25536",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentVedleggdatadef25536",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25536.SoknadPatentVedleggdatadef25536.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadPatentVedlegg-datadef-25536",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadenOmfatter-grp-5824/properties/SoknadPatentVedlegg-datadef-25536",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentVedleggdatadef25536 : [0..1] SoknadPatentVedleggdatadef25536"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.orid": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.orid",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentkravAntalldatadef25535/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25535",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentkravAntall-datadef-25535/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.value": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.value",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535",
      "TypeName": "PosHeltall3repformat126",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.soknadenOmfattergrp5824.soknadPatentkravAntalldatadef25535.value",
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentkravAntalldatadef25535/value",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        },
        "maximum": {
          "Value": "999",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "PositiveInteger",
      "Texts": {
        "Label": "25535.SoknadPatentkravAntalldatadef25535.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentkravAntall-datadef-25535/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535.value : [1..1] PosHeltall3repformat126"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535",
      "ParentElement": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824",
      "TypeName": "SoknadPatentkravAntalldatadef25535",
      "Name": "SoknadPatentkravAntalldatadef25535",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824/SoknadPatentkravAntalldatadef25535",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25535.SoknadPatentkravAntalldatadef25535.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadPatentkravAntall-datadef-25535",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadenOmfatter-grp-5824/properties/SoknadPatentkravAntall-datadef-25535",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824.SoknadPatentkravAntalldatadef25535 : [0..1] SoknadPatentkravAntalldatadef25535"
    },
    "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824": {
      "ID": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "SoknadenOmfattergrp5824",
      "Name": "SoknadenOmfattergrp5824",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/SoknadenOmfattergrp5824",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadenOmfatter-grp-5824",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/SoknadenOmfatter-grp-5824",
      "DisplayString": "Skjema.Soknadgrp5823.SoknadenOmfattergrp5824 : [0..1] SoknadenOmfattergrp5824"
    },
    "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/InformasjonOmBiologiskMaterialegrp5825/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5825",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmBiologiskMateriale-grp-5825/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.orid": {
      "ID": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.orid",
      "ParentElement": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/InformasjonOmBiologiskMaterialegrp5825/SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25537",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentVedleggInformasjonBiologiskMateriale-datadef-25537/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.value": {
      "ID": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.value",
      "ParentElement": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.informasjonOmBiologiskMaterialegrp5825.soknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.value",
      "XPath": "/Skjema/Soknadgrp5823/InformasjonOmBiologiskMaterialegrp5825/SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25537.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPatentVedleggInformasjonBiologiskMateriale-datadef-25537/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537": {
      "ID": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "ParentElement": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825",
      "TypeName": "SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "Name": "SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/InformasjonOmBiologiskMaterialegrp5825/SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25537.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadPatentVedleggInformasjonBiologiskMateriale-datadef-25537",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/InformasjonOmBiologiskMateriale-grp-5825/properties/SoknadPatentVedleggInformasjonBiologiskMateriale-datadef-25537",
      "DisplayString": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825.SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537 : [0..1] SoknadPatentVedleggInformasjonBiologiskMaterialedatadef25537"
    },
    "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825": {
      "ID": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "InformasjonOmBiologiskMaterialegrp5825",
      "Name": "InformasjonOmBiologiskMaterialegrp5825",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/InformasjonOmBiologiskMaterialegrp5825",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "InformasjonOmBiologiskMateriale-grp-5825",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/InformasjonOmBiologiskMateriale-grp-5825",
      "DisplayString": "Skjema.Soknadgrp5823.InformasjonOmBiologiskMaterialegrp5825 : [0..1] InformasjonOmBiologiskMaterialegrp5825"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5826",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/DeponeringAvBiologiskMateriale-grp-5826/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.orid": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.orid",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/ProveBiologiskMaterialeInnlevertdatadef25540/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25540",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/ProveBiologiskMaterialeInnlevert-datadef-25540/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.value": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.value",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.deponeringAvBiologiskMaterialegrp5826.proveBiologiskMaterialeInnlevertdatadef25540.value",
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/ProveBiologiskMaterialeInnlevertdatadef25540/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25540.ProveBiologiskMaterialeInnlevertdatadef25540.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/ProveBiologiskMaterialeInnlevert-datadef-25540/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826",
      "TypeName": "ProveBiologiskMaterialeInnlevertdatadef25540",
      "Name": "ProveBiologiskMaterialeInnlevertdatadef25540",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/ProveBiologiskMaterialeInnlevertdatadef25540",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25540.ProveBiologiskMaterialeInnlevertdatadef25540.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "ProveBiologiskMaterialeInnlevert-datadef-25540",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/DeponeringAvBiologiskMateriale-grp-5826/properties/ProveBiologiskMaterialeInnlevert-datadef-25540",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.ProveBiologiskMaterialeInnlevertdatadef25540 : [0..1] ProveBiologiskMaterialeInnlevertdatadef25540"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.orid": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.orid",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiSteddatadef25538/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25538",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AvfallsdeponiSted-datadef-25538/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.value": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.value",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538",
      "TypeName": "Tekst1000repformat77",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.deponeringAvBiologiskMaterialegrp5826.avfallsdeponiSteddatadef25538.value",
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiSteddatadef25538/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "1000",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25538.AvfallsdeponiSteddatadef25538.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AvfallsdeponiSted-datadef-25538/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538.value : [1..1] Tekst1000repformat77"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826",
      "TypeName": "AvfallsdeponiSteddatadef25538",
      "Name": "AvfallsdeponiSteddatadef25538",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiSteddatadef25538",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25538.AvfallsdeponiSteddatadef25538.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "AvfallsdeponiSted-datadef-25538",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/DeponeringAvBiologiskMateriale-grp-5826/properties/AvfallsdeponiSted-datadef-25538",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiSteddatadef25538 : [0..1] AvfallsdeponiSteddatadef25538"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.orid": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.orid",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiNummerdatadef25539/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25539",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AvfallsdeponiNummer-datadef-25539/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.value": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.value",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539",
      "TypeName": "Tekst255repformat311",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.deponeringAvBiologiskMaterialegrp5826.avfallsdeponiNummerdatadef25539.value",
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiNummerdatadef25539/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "255",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25539.AvfallsdeponiNummerdatadef25539.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/AvfallsdeponiNummer-datadef-25539/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539.value : [1..1] Tekst255repformat311"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539",
      "ParentElement": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826",
      "TypeName": "AvfallsdeponiNummerdatadef25539",
      "Name": "AvfallsdeponiNummerdatadef25539",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826/AvfallsdeponiNummerdatadef25539",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25539.AvfallsdeponiNummerdatadef25539.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "AvfallsdeponiNummer-datadef-25539",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/DeponeringAvBiologiskMateriale-grp-5826/properties/AvfallsdeponiNummer-datadef-25539",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826.AvfallsdeponiNummerdatadef25539 : [0..1] AvfallsdeponiNummerdatadef25539"
    },
    "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826": {
      "ID": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "DeponeringAvBiologiskMaterialegrp5826",
      "Name": "DeponeringAvBiologiskMaterialegrp5826",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/DeponeringAvBiologiskMaterialegrp5826",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "DeponeringAvBiologiskMateriale-grp-5826",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/DeponeringAvBiologiskMateriale-grp-5826",
      "DisplayString": "Skjema.Soknadgrp5823.DeponeringAvBiologiskMaterialegrp5826 : [0..1] DeponeringAvBiologiskMaterialegrp5826"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5827",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/TypeSoknad-grp-5827/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.orid": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.orid",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadTypeAvdeltUtskiltdatadef25541/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25541",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadTypeAvdeltUtskilt-datadef-25541/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.value": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.value",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541",
      "TypeName": "KodelisteEttValg2AvdeltUtskiltrepformat491",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.typeSoknadgrp5827.soknadTypeAvdeltUtskiltdatadef25541.value",
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadTypeAvdeltUtskiltdatadef25541/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "10",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Avdelt;Utskilt",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25541.SoknadTypeAvdeltUtskiltdatadef25541.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadTypeAvdeltUtskilt-datadef-25541/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541.value : [1..1] KodelisteEttValg2AvdeltUtskiltrepformat491"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827",
      "TypeName": "SoknadTypeAvdeltUtskiltdatadef25541",
      "Name": "SoknadTypeAvdeltUtskiltdatadef25541",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadTypeAvdeltUtskiltdatadef25541",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25541.SoknadTypeAvdeltUtskiltdatadef25541.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadTypeAvdeltUtskilt-datadef-25541",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/TypeSoknad-grp-5827/properties/SoknadTypeAvdeltUtskilt-datadef-25541",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadTypeAvdeltUtskiltdatadef25541 : [0..1] SoknadTypeAvdeltUtskiltdatadef25541"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.orid": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.orid",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadDatodatadef5053/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "5053",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadDato-datadef-5053/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.value": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.value",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053",
      "TypeName": "Datorepformat5",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.typeSoknadgrp5827.soknadDatodatadef5053.value",
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadDatodatadef5053/value",
      "Restrictions": {},
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "Date",
      "Texts": {
        "Label": "5053.SoknadDatodatadef5053.Label",
        "PlaceHolder": "5053.SoknadDatodatadef5053.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadDato-datadef-5053/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053.value : [1..1] Datorepformat5"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827",
      "TypeName": "SoknadDatodatadef5053",
      "Name": "SoknadDatodatadef5053",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadDatodatadef5053",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "5053.SoknadDatodatadef5053.Label",
        "PlaceHolder": "5053.SoknadDatodatadef5053.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadDato-datadef-5053",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/TypeSoknad-grp-5827/properties/SoknadDato-datadef-5053",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadDatodatadef5053 : [0..1] SoknadDatodatadef5053"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.orid": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.orid",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadNummerdatadef25542/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25542",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadNummer-datadef-25542/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.value": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.value",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542",
      "TypeName": "Tekst16repformat235",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.typeSoknadgrp5827.soknadNummerdatadef25542.value",
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadNummerdatadef25542/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "16",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25542.SoknadNummerdatadef25542.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadNummer-datadef-25542/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542.value : [1..1] Tekst16repformat235"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542",
      "ParentElement": "Skjema.Soknadgrp5823.TypeSoknadgrp5827",
      "TypeName": "SoknadNummerdatadef25542",
      "Name": "SoknadNummerdatadef25542",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827/SoknadNummerdatadef25542",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25542.SoknadNummerdatadef25542.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadNummer-datadef-25542",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/TypeSoknad-grp-5827/properties/SoknadNummer-datadef-25542",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827.SoknadNummerdatadef25542 : [0..1] SoknadNummerdatadef25542"
    },
    "Skjema.Soknadgrp5823.TypeSoknadgrp5827": {
      "ID": "Skjema.Soknadgrp5823.TypeSoknadgrp5827",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "TypeSoknadgrp5827",
      "Name": "TypeSoknadgrp5827",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/TypeSoknadgrp5827",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "TypeSoknad-grp-5827",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/TypeSoknad-grp-5827",
      "DisplayString": "Skjema.Soknadgrp5823.TypeSoknadgrp5827 : [0..1] TypeSoknadgrp5827"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.gruppeid": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.gruppeid",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5828",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Forundersokelse-grp-5828/properties/gruppeid",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.gruppeid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.orid": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.orid",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseArdatadef25363/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25363",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkeForundersokelseAr-datadef-25363/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.value": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.value",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363",
      "TypeName": "Heltall4repformat38",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.forundersokelsegrp5828.varemerkeForundersokelseArdatadef25363.value",
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseArdatadef25363/value",
      "Restrictions": {
        "totalDigits": {
          "Value": "4",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "Integer",
      "Texts": {
        "Label": "25363.VaremerkeForundersokelseArdatadef25363.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkeForundersokelseAr-datadef-25363/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363.value : [1..1] Heltall4repformat38"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828",
      "TypeName": "VaremerkeForundersokelseArdatadef25363",
      "Name": "VaremerkeForundersokelseArdatadef25363",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseArdatadef25363",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25363.VaremerkeForundersokelseArdatadef25363.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VaremerkeForundersokelseAr-datadef-25363",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Forundersokelse-grp-5828/properties/VaremerkeForundersokelseAr-datadef-25363",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseArdatadef25363 : [0..1] VaremerkeForundersokelseArdatadef25363"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.orid": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.orid",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseNummerdatadef25364/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25364",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkeForundersokelseNummer-datadef-25364/properties/orid",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.orid : [1..1] Integer"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.value": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.value",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364",
      "TypeName": "Heltall6repformat89",
      "Name": "value",
      "DataBindingName": "soknadgrp5823.forundersokelsegrp5828.varemerkeForundersokelseNummerdatadef25364.value",
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseNummerdatadef25364/value",
      "Restrictions": {
        "totalDigits": {
          "Value": "6",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "Integer",
      "Texts": {
        "Label": "25364.VaremerkeForundersokelseNummerdatadef25364.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkeForundersokelseNummer-datadef-25364/properties/value",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364.value : [1..1] Heltall6repformat89"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364",
      "ParentElement": "Skjema.Soknadgrp5823.Forundersokelsegrp5828",
      "TypeName": "VaremerkeForundersokelseNummerdatadef25364",
      "Name": "VaremerkeForundersokelseNummerdatadef25364",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828/VaremerkeForundersokelseNummerdatadef25364",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25364.VaremerkeForundersokelseNummerdatadef25364.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VaremerkeForundersokelseNummer-datadef-25364",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Forundersokelse-grp-5828/properties/VaremerkeForundersokelseNummer-datadef-25364",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828.VaremerkeForundersokelseNummerdatadef25364 : [0..1] VaremerkeForundersokelseNummerdatadef25364"
    },
    "Skjema.Soknadgrp5823.Forundersokelsegrp5828": {
      "ID": "Skjema.Soknadgrp5823.Forundersokelsegrp5828",
      "ParentElement": "Skjema.Soknadgrp5823",
      "TypeName": "Forundersokelsegrp5828",
      "Name": "Forundersokelsegrp5828",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823/Forundersokelsegrp5828",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Forundersokelse-grp-5828",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Soknad-grp-5823/properties/Forundersokelse-grp-5828",
      "DisplayString": "Skjema.Soknadgrp5823.Forundersokelsegrp5828 : [0..1] Forundersokelsegrp5828"
    },
    "Skjema.Soknadgrp5823": {
      "ID": "Skjema.Soknadgrp5823",
      "ParentElement": "Skjema",
      "TypeName": "Soknadgrp5823",
      "Name": "Soknadgrp5823",
      "DataBindingName": null,
      "XPath": "/Skjema/Soknadgrp5823",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Soknad-grp-5823",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Soknad-grp-5823",
      "DisplayString": "Skjema.Soknadgrp5823 : [0..1] Soknadgrp5823"
    },
    "Skjema.Prioritetgrp5829.gruppeid": {
      "ID": "Skjema.Prioritetgrp5829.gruppeid",
      "ParentElement": "Skjema.Prioritetgrp5829",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5829",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritet-grp-5829/properties/gruppeid",
      "DisplayString": "Skjema.Prioritetgrp5829.gruppeid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.gruppeid": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.gruppeid",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5830",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VidereforingAvPCT-grp-5830/properties/gruppeid",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.gruppeid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.orid": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTDatodatadef25543/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25543",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTDato-datadef-25543/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.value": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.value",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543",
      "TypeName": "Datorepformat5",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.videreforingAvPCTgrp5830.soknadVidereforingPCTDatodatadef25543.value",
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTDatodatadef25543/value",
      "Restrictions": {},
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "Date",
      "Texts": {
        "Label": "25543.SoknadVidereforingPCTDatodatadef25543.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTDato-datadef-25543/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543.value : [1..1] Datorepformat5"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "TypeName": "SoknadVidereforingPCTDatodatadef25543",
      "Name": "SoknadVidereforingPCTDatodatadef25543",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTDatodatadef25543",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25543.SoknadVidereforingPCTDatodatadef25543.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadVidereforingPCTDato-datadef-25543",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VidereforingAvPCT-grp-5830/properties/SoknadVidereforingPCTDato-datadef-25543",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTDatodatadef25543 : [0..1] SoknadVidereforingPCTDatodatadef25543"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.orid": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTKodeArLanddatadef25544/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25544",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTKodeArLand-datadef-25544/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.value": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.value",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544",
      "TypeName": "Tekst4repformat28",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.videreforingAvPCTgrp5830.soknadVidereforingPCTKodeArLanddatadef25544.value",
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTKodeArLanddatadef25544/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "4",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25544.SoknadVidereforingPCTKodeArLanddatadef25544.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTKodeArLand-datadef-25544/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544.value : [1..1] Tekst4repformat28"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "TypeName": "SoknadVidereforingPCTKodeArLanddatadef25544",
      "Name": "SoknadVidereforingPCTKodeArLanddatadef25544",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTKodeArLanddatadef25544",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25544.SoknadVidereforingPCTKodeArLanddatadef25544.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadVidereforingPCTKodeArLand-datadef-25544",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VidereforingAvPCT-grp-5830/properties/SoknadVidereforingPCTKodeArLand-datadef-25544",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTKodeArLanddatadef25544 : [0..1] SoknadVidereforingPCTKodeArLanddatadef25544"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.orid": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTSoknadsnummerdatadef25545/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25545",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTSoknadsnummer-datadef-25545/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.value": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.value",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "TypeName": "Tekst14repformat153",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.videreforingAvPCTgrp5830.soknadVidereforingPCTSoknadsnummerdatadef25545.value",
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTSoknadsnummerdatadef25545/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "14",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25545.SoknadVidereforingPCTSoknadsnummerdatadef25545.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVidereforingPCTSoknadsnummer-datadef-25545/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545.value : [1..1] Tekst14repformat153"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "TypeName": "SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "Name": "SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVidereforingPCTSoknadsnummerdatadef25545",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25545.SoknadVidereforingPCTSoknadsnummerdatadef25545.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadVidereforingPCTSoknadsnummer-datadef-25545",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VidereforingAvPCT-grp-5830/properties/SoknadVidereforingPCTSoknadsnummer-datadef-25545",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVidereforingPCTSoknadsnummerdatadef25545 : [0..1] SoknadVidereforingPCTSoknadsnummerdatadef25545"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.orid": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVedleggOversettelsedatadef25546/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25546",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVedleggOversettelse-datadef-25546/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.value": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.value",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546",
      "TypeName": "KodelisteEttValg2JaNeirepformat4",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.videreforingAvPCTgrp5830.soknadVedleggOversettelsedatadef25546.value",
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVedleggOversettelsedatadef25546/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "3",
          "ErrortText": null
        },
        "enumeration": {
          "Value": "Ja;Nei",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25546.SoknadVedleggOversettelsedatadef25546.Label",
        "Help": "25546.SoknadVedleggOversettelsedatadef25546.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadVedleggOversettelse-datadef-25546/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546.value : [1..1] KodelisteEttValg2JaNeirepformat4"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546",
      "ParentElement": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "TypeName": "SoknadVedleggOversettelsedatadef25546",
      "Name": "SoknadVedleggOversettelsedatadef25546",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830/SoknadVedleggOversettelsedatadef25546",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25546.SoknadVedleggOversettelsedatadef25546.Label",
        "Help": "25546.SoknadVedleggOversettelsedatadef25546.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadVedleggOversettelse-datadef-25546",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VidereforingAvPCT-grp-5830/properties/SoknadVedleggOversettelse-datadef-25546",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830.SoknadVedleggOversettelsedatadef25546 : [0..1] SoknadVedleggOversettelsedatadef25546"
    },
    "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830": {
      "ID": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830",
      "ParentElement": "Skjema.Prioritetgrp5829",
      "TypeName": "VidereforingAvPCTgrp5830",
      "Name": "VidereforingAvPCTgrp5830",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/VidereforingAvPCTgrp5830",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VidereforingAvPCT-grp-5830",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritet-grp-5829/properties/VidereforingAvPCT-grp-5830",
      "DisplayString": "Skjema.Prioritetgrp5829.VidereforingAvPCTgrp5830 : [0..1] VidereforingAvPCTgrp5830"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.gruppeid": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.gruppeid",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831",
      "TypeName": "Integer",
      "Name": "gruppeid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/gruppeid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "gruppeid",
      "IsTagContent": false,
      "FixedValue": "5831",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritetskrav-grp-5831/properties/gruppeid",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].gruppeid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367.orid": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetDatodatadef25367/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25367",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkePrioritetDato-datadef-25367/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetDatodatadef25367.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367.value": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367.value",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367",
      "TypeName": "Datorepformat5",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.prioritetskravgrp5831.varemerkePrioritetDatodatadef25367.value",
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetDatodatadef25367/value",
      "Restrictions": {},
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "Date",
      "Texts": {
        "Label": "25367.VaremerkePrioritetDatodatadef25367.Label",
        "PlaceHolder": "25367.VaremerkePrioritetDatodatadef25367.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkePrioritetDato-datadef-25367/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetDatodatadef25367.value : [1..1] Datorepformat5"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetDatodatadef25367",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831",
      "TypeName": "VaremerkePrioritetDatodatadef25367",
      "Name": "VaremerkePrioritetDatodatadef25367",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetDatodatadef25367",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25367.VaremerkePrioritetDatodatadef25367.Label",
        "PlaceHolder": "25367.VaremerkePrioritetDatodatadef25367.PlaceHolder"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VaremerkePrioritetDato-datadef-25367",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritetskrav-grp-5831/properties/VaremerkePrioritetDato-datadef-25367",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetDatodatadef25367 : [0..1] VaremerkePrioritetDatodatadef25367"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368.orid": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetLandkodedatadef25368/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25368",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkePrioritetLandkode-datadef-25368/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetLandkodedatadef25368.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368.value": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368.value",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368",
      "TypeName": "Tekst2repformat117",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.prioritetskravgrp5831.varemerkePrioritetLandkodedatadef25368.value",
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetLandkodedatadef25368/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "2",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25368.VaremerkePrioritetLandkodedatadef25368.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/VaremerkePrioritetLandkode-datadef-25368/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetLandkodedatadef25368.value : [1..1] Tekst2repformat117"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.VaremerkePrioritetLandkodedatadef25368",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831",
      "TypeName": "VaremerkePrioritetLandkodedatadef25368",
      "Name": "VaremerkePrioritetLandkodedatadef25368",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/VaremerkePrioritetLandkodedatadef25368",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25368.VaremerkePrioritetLandkodedatadef25368.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "VaremerkePrioritetLandkode-datadef-25368",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritetskrav-grp-5831/properties/VaremerkePrioritetLandkode-datadef-25368",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].VaremerkePrioritetLandkodedatadef25368 : [0..1] VaremerkePrioritetLandkodedatadef25368"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547.orid": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547.orid",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547",
      "TypeName": "Integer",
      "Name": "orid",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/SoknadPrioritetskravSoknadsnummerdatadef25547/orid",
      "Restrictions": {
        "minimum": {
          "Value": "0",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Attribute",
      "XsdValueType": "PositiveInteger",
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "orid",
      "IsTagContent": false,
      "FixedValue": "25547",
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPrioritetskravSoknadsnummer-datadef-25547/properties/orid",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].SoknadPrioritetskravSoknadsnummerdatadef25547.orid : [1..1] Integer"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547.value": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547.value",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547",
      "TypeName": "Tekst16repformat235",
      "Name": "value",
      "DataBindingName": "prioritetgrp5829.prioritetskravgrp5831.soknadPrioritetskravSoknadsnummerdatadef25547.value",
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/SoknadPrioritetskravSoknadsnummerdatadef25547/value",
      "Restrictions": {
        "minLength": {
          "Value": "1",
          "ErrortText": null
        },
        "maxLength": {
          "Value": "16",
          "ErrortText": null
        }
      },
      "Choices": null,
      "Type": "Field",
      "XsdValueType": "String",
      "Texts": {
        "Label": "25547.SoknadPrioritetskravSoknadsnummerdatadef25547.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 1,
      "XName": "value",
      "IsTagContent": true,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/SoknadPrioritetskravSoknadsnummer-datadef-25547/properties/value",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].SoknadPrioritetskravSoknadsnummerdatadef25547.value : [1..1] Tekst16repformat235"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831.SoknadPrioritetskravSoknadsnummerdatadef25547",
      "ParentElement": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831",
      "TypeName": "SoknadPrioritetskravSoknadsnummerdatadef25547",
      "Name": "SoknadPrioritetskravSoknadsnummerdatadef25547",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831/SoknadPrioritetskravSoknadsnummerdatadef25547",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "25547.SoknadPrioritetskravSoknadsnummerdatadef25547.Label"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "SoknadPrioritetskravSoknadsnummer-datadef-25547",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritetskrav-grp-5831/properties/SoknadPrioritetskravSoknadsnummer-datadef-25547",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831[*].SoknadPrioritetskravSoknadsnummerdatadef25547 : [0..1] SoknadPrioritetskravSoknadsnummerdatadef25547"
    },
    "Skjema.Prioritetgrp5829.Prioritetskravgrp5831": {
      "ID": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831",
      "ParentElement": "Skjema.Prioritetgrp5829",
      "TypeName": "Prioritetskravgrp5831",
      "Name": "Prioritetskravgrp5831",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829/Prioritetskravgrp5831",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 99,
      "MinOccurs": 0,
      "XName": "Prioritetskrav-grp-5831",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Prioritet-grp-5829/properties/Prioritetskrav-grp-5831",
      "DisplayString": "Skjema.Prioritetgrp5829.Prioritetskravgrp5831 : [0..99] Prioritetskravgrp5831"
    },
    "Skjema.Prioritetgrp5829": {
      "ID": "Skjema.Prioritetgrp5829",
      "ParentElement": "Skjema",
      "TypeName": "Prioritetgrp5829",
      "Name": "Prioritetgrp5829",
      "DataBindingName": null,
      "XPath": "/Skjema/Prioritetgrp5829",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {},
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Prioritet-grp-5829",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/definitions/Skjema/properties/Prioritet-grp-5829",
      "DisplayString": "Skjema.Prioritetgrp5829 : [0..1] Prioritetgrp5829"
    },
    "Skjema": {
      "ID": "Skjema",
      "ParentElement": null,
      "TypeName": "Skjema",
      "Name": "Skjema",
      "DataBindingName": null,
      "XPath": "/Skjema",
      "Restrictions": {},
      "Choices": null,
      "Type": "Group",
      "XsdValueType": null,
      "Texts": {
        "Label": "Skjema.Label",
        "Help": "Skjema.Help"
      },
      "CustomProperties": {},
      "MaxOccurs": 1,
      "MinOccurs": 0,
      "XName": "Skjema",
      "IsTagContent": false,
      "FixedValue": null,
      "IsReadOnly": false,
      "XmlSchemaXPath": null,
      "JsonSchemaPointer": "#/properties/Skjema",
      "DisplayString": "Skjema : [0..1] Skjema"
    }
  }
};