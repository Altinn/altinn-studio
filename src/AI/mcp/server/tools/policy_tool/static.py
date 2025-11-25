"""
This file contains list over access controls and resource attributes used in XACML policies.
"""

# List of access controls from XACML policy
access_controls = ["access", "complete", "confirm", "delete", "instantiate", "pay", "publish", "reject", "scopeaccess", "sign", "subscribe", "write"]

# List of resource attributes from XACML policy
resource_attributes = [
    {"attribute": "urn:altinn:org", "description": "The org part of the resource attribute defines which org that owns the app."},
    {"attribute": "urn:altinn:app", "description": "The app part that identifies the app itself."},
    {"attribute": "urn:altinn:task", "description": "The task part of the resource makes it possible to have separate rules for the different tasks."},
    {"attribute": "urn:altinn:event", "description": "The event part of the resource makes it possible to have separate rules for reading events."}
]

# List of possible roles
all_roles = [
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 1,
        "RoleName": "Konkursbo lesetilgang",
        "RoleDescription": "Tilgang til å lese informasjon i tjenesten Konkursbehandling",
        "RoleDefinitionCode": "BOBEL",
        "ParentRoleDefinitionIds": [161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/1"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 2,
        "RoleName": "Konkursbo skrivetilgang",
        "RoleDescription": "Utvidet lesetilgang og innsendingsrett for tjenesten Konkursbehandling",
        "RoleDefinitionCode": "BOBES",
        "ParentRoleDefinitionIds": [161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/2"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 3,
        "RoleName": "Lønn og personalmedarbeider",
        "RoleDescription": "Denne rollen gir rettighet til lønns- og personalrelaterte tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "LOPER",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 127, 138, 139, 143, 151, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/3"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 4,
        "RoleName": "Tilgangsstyring",
        "RoleDescription": "Denne rollen gir administratortilgang til å gi videre rettigheter til andre.\r\n",
        "RoleDefinitionCode": "ADMAI",
        "ParentRoleDefinitionIds": [82, 113, 117, 122, 125, 138, 139, 143, 152, 153, 154, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/4"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 5,
        "RoleName": "Privatperson begrensede rettigheter",
        "RoleDescription": "Denne rollen gir mulighet til å benytte tjenester på vegne av en annen privatperson. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "PRIUT",
        "ParentRoleDefinitionIds": [82],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/5"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6,
        "RoleName": "Regnskapsmedarbeider",
        "RoleDescription": "Denne rollen gir rettighet til regnskapsrelaterte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "REGNA",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 150, 151, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/6"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 7,
        "RoleName": "Revisorrettighet",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester",
        "RoleDefinitionCode": "REVAI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/7"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 8,
        "RoleName": "Begrenset signeringsrettighet",
        "RoleDescription": "Tilgang til å signere utvalgte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "SISKD",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 143, 151, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/8"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 10,
        "RoleName": "Samferdsel",
        "RoleDescription": "Rollen gir rettighet til tjenester relatert til samferdsel. For eksempel tjenester fra Statens Vegvesen, Sjøfartsdirektoratet og Luftfartstilsynet. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rol",
        "RoleDefinitionCode": "UILUF",
        "ParentRoleDefinitionIds": [82, 117, 125, 138, 139, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/10"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 11,
        "RoleName": "Utfyller/Innsender",
        "RoleDescription": "Denne rollen gir rettighet til et bredt utvalg skjema og tjenester som ikke har så strenge krav til autorisasjon. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "UTINN",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 152, 154, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/11"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 12,
        "RoleName": "Energi, miljø og klima",
        "RoleDescription": "Tilgang til tjenester relatert til energi, miljø og klima. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "UTOMR",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 126, 127, 138, 139, 143, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/12"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 15,
        "RoleName": "Klientadministrator",
        "RoleDescription": "Tilgang til å administrere klientroller for regnskapsførere og revisorer",
        "RoleDefinitionCode": "KLADM",
        "ParentRoleDefinitionIds": [113, 117, 122, 125, 138, 139, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/15"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 17,
        "RoleName": "BR - Enhet/Foretak",
        "RoleDescription": "BR - Enhet/Foretak",
        "RoleDefinitionCode": "BRENF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/17"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 18,
        "RoleName": "BR-Regnskap",
        "RoleDescription": "BR-Regnskap",
        "RoleDefinitionCode": "BRRGN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/18"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 19,
        "RoleName": "Godkjenning av bedriftshelsetjeneste",
        "RoleDescription": "Godkjenning av bedriftshelsetjeneste",
        "RoleDefinitionCode": "GKBHT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/19"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 20,
        "RoleName": "Konkurransetilsynet skjema",
        "RoleDescription": "Konkurransetilsynet skjema",
        "RoleDefinitionCode": "KTSTD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/20"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 21,
        "RoleName": "Altinn Forvalter",
        "RoleDescription": "Altinn Forvalter",
        "RoleDefinitionCode": "LOFRV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/21"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 22,
        "RoleName": "Skjemautvikler",
        "RoleDescription": "Skjemautvikler",
        "RoleDefinitionCode": "LOUTV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/22"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 23,
        "RoleName": "Økokrimskjema",
        "RoleDescription": "Økokrimskjema",
        "RoleDefinitionCode": "OKSKJ",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/23"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 25,
        "RoleName": "PSA - Etatsrolle",
        "RoleDescription": "PSA - Etatsrolle",
        "RoleDefinitionCode": "PSA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/25"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 26,
        "RoleName": "Alle etats Rapporter",
        "RoleDescription": "Alle etats Rapporter",
        "RoleDefinitionCode": "RPALT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 27,
        "RoleName": "Rapporter BK",
        "RoleDescription": "Rapporter BK",
        "RoleDefinitionCode": "RPBK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/27"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 28,
        "RoleName": "Rapporter Brønnøysund registerene",
        "RoleDescription": "Rapporter Brønnøysund registerene",
        "RoleDefinitionCode": "RPBRR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/28"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 29,
        "RoleName": "Rapporter DAT",
        "RoleDescription": "Rapporter DAT",
        "RoleDefinitionCode": "RPDAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/29"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30,
        "RoleName": "Rapporter FK",
        "RoleDescription": "Rapporter FK",
        "RoleDefinitionCode": "RPFK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 31,
        "RoleName": "Rapporter for Fiskeri- og kystdepartementet",
        "RoleDescription": "Rapporter for Fiskeri- og kystdepartementet",
        "RoleDefinitionCode": "RPFKD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 32,
        "RoleName": "Rapporter Htil",
        "RoleDescription": "Rapporter Htil",
        "RoleDefinitionCode": "RPHTL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/32"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 33,
        "RoleName": "Rapporter for Husbanken",
        "RoleDescription": "Rapporter for Husbanken",
        "RoleDefinitionCode": "RPHUS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/33"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 34,
        "RoleName": "Rapporter for Konkurransetilsynet",
        "RoleDescription": "Rapporter for Konkurransetilsynet",
        "RoleDefinitionCode": "RPKOT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/34"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 35,
        "RoleName": "Rapporter for Kredittilsynet",
        "RoleDescription": "Rapporter for Kredittilsynet",
        "RoleDefinitionCode": "RPKRT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/35"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 36,
        "RoleName": "Rapporter for Lotteri- og stiftelsestilsynet",
        "RoleDescription": "Rapporter for Lotteri- og stiftelsestilsynet",
        "RoleDefinitionCode": "RPLTS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/36"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37,
        "RoleName": "Luftfartstilsynet bakgrunnssjekk",
        "RoleDescription": "Luftfartstilsynet bakgrunnssjekk",
        "RoleDefinitionCode": "RPLUF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 38,
        "RoleName": "Rapporter for Mattilsynet",
        "RoleDescription": "Rapporter for Mattilsynet",
        "RoleDefinitionCode": "RPMAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/38"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 39,
        "RoleName": "Rapporter for NAV",
        "RoleDescription": "Rapporter for NAV",
        "RoleDefinitionCode": "RPNAV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/39"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 40,
        "RoleName": "Rapporter for Norges Bank",
        "RoleDescription": "Rapporter for Norges Bank",
        "RoleDefinitionCode": "RPNBA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/40"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 41,
        "RoleName": "Rapporter NPE",
        "RoleDescription": "Rapporter NPE",
        "RoleDefinitionCode": "RPNPE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/41"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 42,
        "RoleName": "Rapporter for NVE",
        "RoleDescription": "Rapporter for NVE",
        "RoleDefinitionCode": "RPNVE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/42"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 43,
        "RoleName": "Rapporter OK",
        "RoleDescription": "Rapporter OK",
        "RoleDefinitionCode": "RPOK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/43"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 44,
        "RoleName": "Rapporter for Økokrim",
        "RoleDescription": "Rapporter for Økokrim",
        "RoleDefinitionCode": "RPOKO",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/44"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 45,
        "RoleName": "Rapporter for Patentstyret",
        "RoleDescription": "Rapporter for Patentstyret",
        "RoleDefinitionCode": "RPPAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/45"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 46,
        "RoleName": "Rapporter SFD",
        "RoleDescription": "Tjenesteeiers arkiv",
        "RoleDefinitionCode": "RPSDI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/46"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 47,
        "RoleName": "Rapporter for Statens Forurensningstilsyn",
        "RoleDescription": "Rapporter for Statens Forurensningstilsyn",
        "RoleDefinitionCode": "RPSFT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/47"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 48,
        "RoleName": "Rapporter for Statens Innkrevingssentral",
        "RoleDescription": "Rapporter for Statens Innkrevingssentral",
        "RoleDefinitionCode": "RPSIS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/48"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 49,
        "RoleName": "Rapporter SKD",
        "RoleDescription": "Rapporter SKD",
        "RoleDefinitionCode": "RPSKD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/49"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 50,
        "RoleName": "Rapporter for Statens Lånekasse",
        "RoleDescription": "Rapporter for Statens Lånekasse",
        "RoleDefinitionCode": "RPSLA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/50"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 51,
        "RoleName": "Rapporter for SLF",
        "RoleDescription": "Rapporter for SLF",
        "RoleDefinitionCode": "RPSLF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/51"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 52,
        "RoleName": "Rapporter SPK",
        "RoleDescription": "Rapporter SPK",
        "RoleDefinitionCode": "RPSPK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/52"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 53,
        "RoleName": "Rapporter SSB",
        "RoleDescription": "Rapporter SSB",
        "RoleDefinitionCode": "RPSSB",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/53"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 54,
        "RoleName": "Rapporter for Utlendingsdirektoratet",
        "RoleDescription": "Rapporter for Utlendingsdirektoratet",
        "RoleDefinitionCode": "RPUDI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/54"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 55,
        "RoleName": "SSB-Lønnsstatistikk",
        "RoleDescription": "SSB-Lønnsstatistikk",
        "RoleDefinitionCode": "SBLØN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/55"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 56,
        "RoleName": "SSB-Syke fraværsstatistikk",
        "RoleDescription": "SSB-Syke fraværsstatistikk",
        "RoleDefinitionCode": "SBSYK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/56"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 57,
        "RoleName": "Sikkerhetsrolle for felleskontoret",
        "RoleDescription": "Sikkerhetsrolle for felleskontoret",
        "RoleDefinitionCode": "SIKRF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/57"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 58,
        "RoleName": "Elektronisk flyttemelding",
        "RoleDescription": "Elektronisk flyttemelding",
        "RoleDefinitionCode": "SKEFM",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/58"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 59,
        "RoleName": "Fiskeri- og kystdepartementet skjema",
        "RoleDescription": "Fiskeri- og kystdepartementet skjema",
        "RoleDefinitionCode": "SKFKD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/59"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 60,
        "RoleName": "FLT-Skjema",
        "RoleDescription": "FLT-Skjema",
        "RoleDefinitionCode": "SKFLT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/60"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 61,
        "RoleName": "SKD Grunnlagsdata",
        "RoleDescription": "SKD Grunnlagsdata",
        "RoleDefinitionCode": "SKGLD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/61"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 62,
        "RoleName": "Htil skjema",
        "RoleDescription": "Htil skjema",
        "RoleDefinitionCode": "SKHTL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/62"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 63,
        "RoleName": "Husbanken skjema",
        "RoleDescription": "Husbanken skjema",
        "RoleDefinitionCode": "SKHUS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/63"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 64,
        "RoleName": "Kredittilsynet skjema",
        "RoleDescription": "Kredittilsynet skjema",
        "RoleDefinitionCode": "SKKRT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/64"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 65,
        "RoleName": "Lotteri- og stiftelsestilsynet skjema",
        "RoleDescription": "Lotteri- og stiftelsestilsynet skjema",
        "RoleDefinitionCode": "SKLTS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/65"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 66,
        "RoleName": "Luftfartstilsynet skjema",
        "RoleDescription": "Luftfartstilsynet skjema",
        "RoleDefinitionCode": "SKLUF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/66"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 67,
        "RoleName": "Mattilsynet skjema",
        "RoleDescription": "Mattilsynet skjema",
        "RoleDefinitionCode": "SKMAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/67"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 68,
        "RoleName": "NAV skjema",
        "RoleDescription": "NAV skjema",
        "RoleDefinitionCode": "SKNAV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/68"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 69,
        "RoleName": "Norges Bank skjema",
        "RoleDescription": "Norges Bank skjema",
        "RoleDefinitionCode": "SKNBA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/69"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 70,
        "RoleName": "NVE skjema",
        "RoleDescription": "NVE skjema",
        "RoleDefinitionCode": "SKNVE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/70"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 71,
        "RoleName": "Patentstyret skjema",
        "RoleDescription": "Patentstyret skjema",
        "RoleDefinitionCode": "SKPAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/71"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 72,
        "RoleName": "PSA-Skjema",
        "RoleDescription": "PSA-Skjema",
        "RoleDefinitionCode": "SKPSA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/72"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 73,
        "RoleName": "SDI skjema",
        "RoleDescription": "SDI skjema",
        "RoleDefinitionCode": "SKSDI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/73"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 74,
        "RoleName": "Statens Forurensningstilsyn skjema",
        "RoleDescription": "Statens Forurensningstilsyn skjema",
        "RoleDefinitionCode": "SKSFT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/74"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 75,
        "RoleName": "Sentralskattekontoret for utenlandssaker skjema",
        "RoleDescription": "Sentralskattekontoret for utenlandssaker skjema",
        "RoleDefinitionCode": "SKSFU",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/75"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 76,
        "RoleName": "Statens Innkrevingssentral skjema",
        "RoleDescription": "Statens Innkrevingssentral skjema",
        "RoleDefinitionCode": "SKSIS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/76"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 77,
        "RoleName": "SLF skjema",
        "RoleDescription": "SLF skjema",
        "RoleDefinitionCode": "SKSLF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/77"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 78,
        "RoleName": "SLN-Skjema",
        "RoleDescription": "SLN-Skjema",
        "RoleDefinitionCode": "SKSLN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/78"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 79,
        "RoleName": "SSB Valuta",
        "RoleDescription": "SSB Valuta",
        "RoleDefinitionCode": "SKSSV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/79"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 80,
        "RoleName": "Statens Lånekasse skjema",
        "RoleDescription": "Statens Lånekasse skjema",
        "RoleDefinitionCode": "SLANT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/80"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 81,
        "RoleName": "Administrator Tjenesteier",
        "RoleDescription": "SO-Administrator",
        "RoleDefinitionCode": "ADMEI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/81"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 82,
        "RoleName": "Privatperson",
        "RoleDescription": "Denne rollen er hentet fra Folkeregisteret og gir rettighet til flere tjenester.\r\n",
        "RoleDefinitionCode": "PRIV",
        "ChildRoleDefinitionIds": [3, 4, 5, 6, 8, 10, 11, 12, 87, 95, 108, 2374, 13612, 28088, 29486],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/82"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 83,
        "RoleName": "Selvregistrert bruker",
        "RoleDescription": "Selvregistrert bruker",
        "RoleDefinitionCode": "SELN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/83"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 84,
        "RoleName": "Sluttbrukersystem",
        "RoleDescription": "Sluttbrukersystem",
        "RoleDefinitionCode": "FAGUT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/84"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 85,
        "RoleName": "Revisorattesterer - MVA kompensasjon",
        "RoleDescription": "Denne rollen gir revisor rettighet til å attestere tjenesten Merverdiavgift - søknad om kompensasjon (RF-0009).",
        "RoleDefinitionCode": "ATTST",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 143, 151, 152, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/85"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 86,
        "RoleName": "Økokrim rapportering",
        "RoleDescription": "Tilgang til tjenester fra Økokrim. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "HVASK",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/86"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 87,
        "RoleName": "Patent, varemerke og design",
        "RoleDescription": "Denne rollen gir rettighet til tjenester relatert til patent, varemerke og design. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "PAVAD",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/87"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 91,
        "RoleName": "Signerer av Samordnet registermelding",
        "RoleDescription": "Denne rollen gir rettighet til tjenester på vegne av enheter/foretak. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "SIGNE",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/91"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 92,
        "RoleName": "Helse-, sosial- og velferdstjenester",
        "RoleDescription": "Tilgang til helse-, sosial- og velferdsrelaterte tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "UIHTL",
        "ParentRoleDefinitionIds": [117, 122, 123, 125, 138, 139, 143, 152, 154, 155, 156, 158, 160],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/92"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 95,
        "RoleName": "Kommunale tjenester",
        "RoleDescription": "Rollen gir tilgang til kommunale tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "KOMAB",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 127, 138, 139, 143, 152, 154, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/95"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 108,
        "RoleName": "Konkursbo tilgangsstyring",
        "RoleDescription": "Denne rollen gir advokater mulighet til å styre hvem som har rettigheter til konkursbo.\r\n",
        "RoleDefinitionCode": "BOADM",
        "ParentRoleDefinitionIds": [82],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/108"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 109,
        "RoleName": "TAD  tollkreditt",
        "RoleDescription": "TAD  tollkreditt",
        "RoleDefinitionCode": "SKTAD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/109"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 110,
        "RoleName": "MVAskjema",
        "RoleDescription": "MVAskjema",
        "RoleDefinitionCode": "SKMVA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/110"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 111,
        "RoleName": "BRKONK  BRbosiden",
        "RoleDescription": "BRKONK  BRbosiden",
        "RoleDefinitionCode": "BRKNK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/111"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 113,
        "RoleName": "Revisor registrert i revisorregisteret",
        "RoleDescription": "Rettigheter for revisjonsselskap",
        "RoleDefinitionCode": "SREVA",
        "ChildRoleDefinitionIds": [4, 15, 8031],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/113"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 114,
        "RoleName": "Inngår i foretaksgruppe med",
        "RoleDescription": "Inngår i foretaksgruppe med",
        "RoleDefinitionCode": "FGRP",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/114"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 115,
        "RoleName": "Hovedforetak",
        "RoleDescription": "Hovedforetak",
        "RoleDefinitionCode": "HFOR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/115"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 116,
        "RoleName": "Helseforetak",
        "RoleDescription": "Helseforetak",
        "RoleDefinitionCode": "HLSE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/116"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 117,
        "RoleName": "Innehaver",
        "RoleDescription": "Innehaver",
        "RoleDefinitionCode": "INNH",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/117"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 118,
        "RoleName": "Har som datter i konsern",
        "RoleDescription": "Har som datter i konsern",
        "RoleDefinitionCode": "KDAT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/118"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 119,
        "RoleName": "Har som grunnlag for konsern",
        "RoleDescription": "Har som grunnlag for konsern",
        "RoleDefinitionCode": "KGRL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/119"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 120,
        "RoleName": "Inngår i kirkelig fellesråd",
        "RoleDescription": "Inngår i kirkelig fellesråd",
        "RoleDefinitionCode": "KIRK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/120"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 121,
        "RoleName": "Har som mor i konsern",
        "RoleDescription": "Har som mor i konsern",
        "RoleDefinitionCode": "KMOR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/121"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 122,
        "RoleName": "Komplementar",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KOMP",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/122"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 123,
        "RoleName": "Kontaktperson",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KONT",
        "ChildRoleDefinitionIds": [3, 6, 11, 92, 95, 28088],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/123"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 124,
        "RoleName": "Inngår i kontorfellesskap",
        "RoleDescription": "Inngår i kontorfellesskap",
        "RoleDefinitionCode": "KTRF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/124"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 125,
        "RoleName": "Styrets leder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "LEDE",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/125"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 126,
        "RoleName": "Styremedlem",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "MEDL",
        "ChildRoleDefinitionIds": [6, 11, 12],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/126"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 127,
        "RoleName": "Nestleder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "NEST",
        "ChildRoleDefinitionIds": [3, 6, 11, 12, 95, 28088],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/127"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 128,
        "RoleName": "Observatør",
        "RoleDescription": "Observatør",
        "RoleDefinitionCode": "OBS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/128"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 129,
        "RoleName": "Er særskilt oppdelt enhet til",
        "RoleDescription": "Er særskilt oppdelt enhet til",
        "RoleDefinitionCode": "OPMV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/129"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 130,
        "RoleName": "Organisasjonsledd i offentlig sektor",
        "RoleDescription": "Organisasjonsledd i offentlig sektor",
        "RoleDefinitionCode": "ORGL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/130"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 131,
        "RoleName": "Prokura i fellesskap",
        "RoleDescription": "Prokura i fellesskap",
        "RoleDefinitionCode": "POFE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/131"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 132,
        "RoleName": "Prokura hver for seg",
        "RoleDescription": "Prokura hver for seg",
        "RoleDefinitionCode": "POHV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/132"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 133,
        "RoleName": "Prokura",
        "RoleDescription": "Prokura",
        "RoleDefinitionCode": "PROK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/133"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 134,
        "RoleName": "Er revisoradresse for",
        "RoleDescription": "Er revisoradresse for",
        "RoleDefinitionCode": "READ",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/134"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 135,
        "RoleName": "Har som registreringsenhet",
        "RoleDescription": "Har som registreringsenhet\r\n",
        "RoleDefinitionCode": "AAFY",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/135"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 136,
        "RoleName": "Forestår avvikling",
        "RoleDescription": "Forestår avvikling",
        "RoleDefinitionCode": "AVKL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/136"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 137,
        "RoleName": "Har som registreringsenhet",
        "RoleDescription": "Har som registreringsenhet",
        "RoleDefinitionCode": "BEDR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/137"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 138,
        "RoleName": "Deltaker med delt ansvar",
        "RoleDescription": "Deltaker med proratarisk ansvar. Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "DTPR",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/138"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 139,
        "RoleName": "Deltaker med fullt ansvar",
        "RoleDescription": "Deltaker med solidarisk ansvar. Ekstern rolle (fra Enhetsregisteret).",
        "RoleDefinitionCode": "DTSO",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/139"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 140,
        "RoleName": "Eierkommune",
        "RoleDescription": "Eierkommune",
        "RoleDefinitionCode": "EIKM",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/140"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 141,
        "RoleName": "Inngår i felles- registrering",
        "RoleDescription": "Inngår i felles- registrering",
        "RoleDefinitionCode": "FEMV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/141"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 142,
        "RoleName": "Er regnskapsføreradresse for",
        "RoleDescription": "Er regnskapsføreradresse for",
        "RoleDefinitionCode": "RFAD",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/142"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 143,
        "RoleName": "Sameiere",
        "RoleDescription": "Ekstern rolle (registrert på Indre selskap/DLS hos SKD)",
        "RoleDefinitionCode": "SAM",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 11, 12, 85, 92, 95, 2374, 13612, 28088, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/143"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 144,
        "RoleName": "Signatur i fellesskap",
        "RoleDescription": "Signatur i fellesskap",
        "RoleDefinitionCode": "SIFE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/144"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 145,
        "RoleName": "Signatur",
        "RoleDescription": "Signatur",
        "RoleDefinitionCode": "SIGN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/145"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 146,
        "RoleName": "Signatur hver for seg",
        "RoleDescription": "Signatur hver for seg",
        "RoleDefinitionCode": "SIHV",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/146"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 147,
        "RoleName": "Er frivillig registrert utleiebygg for",
        "RoleDescription": "Er frivillig registrert utleiebygg for",
        "RoleDefinitionCode": "UTBG",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/147"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 148,
        "RoleName": "Varamedlem",
        "RoleDescription": "Varamedlem",
        "RoleDefinitionCode": "VARA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/148"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 149,
        "RoleName": "Er virksomhet drevet i fellesskap av",
        "RoleDescription": "Er virksomhet drevet i fellesskap av",
        "RoleDefinitionCode": "VIFE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/149"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 150,
        "RoleName": "Utfyller MVA-oppgaver",
        "RoleDescription": "Utfyller MVA-oppgaver",
        "RoleDefinitionCode": "MVAU",
        "ChildRoleDefinitionIds": [6],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/150"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 151,
        "RoleName": "Signerer MVA-oppgaver",
        "RoleDescription": "Signerer MVA-oppgaver",
        "RoleDefinitionCode": "MVAG",
        "ChildRoleDefinitionIds": [3, 6, 8, 85],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/151"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 152,
        "RoleName": "Kontaktperson i kommune",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KOMK",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 11, 12, 85, 92, 95, 13612, 28088, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/152"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 153,
        "RoleName": "Kontaktperson for NUF",
        "RoleDescription": "Kontaktperson for norskregistrert utenlandsk foretak. Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KNUF",
        "ChildRoleDefinitionIds": [4, 8031, 11522, 37501],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/153"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 154,
        "RoleName": "Kontaktperson i Adm. enhet - offentlig sektor",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KEMN",
        "ChildRoleDefinitionIds": [4, 11, 92, 95, 8031, 11522, 13612, 28088, 37500],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/154"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 155,
        "RoleName": "Forretningsfører",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "FFØR",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 11, 12, 92, 95, 2374, 28088],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/155"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 156,
        "RoleName": "Bestyrende reder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "BEST",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/156"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 157,
        "RoleName": "Regnskapsfører",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "REGN",
        "ChildRoleDefinitionIds": [13685, 13686, 13687],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/157"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 158,
        "RoleName": "Norsk representant for utenlandsk enhet",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "REPR",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/158"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 159,
        "RoleName": "Revisor",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "REVI",
        "ChildRoleDefinitionIds": [13684, 13688],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/159"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 160,
        "RoleName": "Daglig leder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "DAGL",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/160"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 161,
        "RoleName": "Bostyrer",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "BOBE",
        "ChildRoleDefinitionIds": [1, 2, 3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 95, 8031, 11522, 13612, 28088, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/161"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 1526,
        "RoleName": "tjenesteier post og teletilsynet",
        "RoleDescription": "Tjenesteeier rolle for post og teletilsynet",
        "RoleDefinitionCode": "A0208",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/1526"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 1527,
        "RoleName": "Tjenesteeier SLV",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv for Staten legemiddelverk",
        "RoleDefinitionCode": "A0209",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/1527"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 1528,
        "RoleName": "Tjenesteeier DIFI",
        "RoleDescription": "Tjenesteeier rolle for DIFI",
        "RoleDefinitionCode": "A0205",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/1528"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 1857,
        "RoleName": "Fiskeridirektoratets skjema",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0210",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/1857"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 2214,
        "RoleName": "TestRole",
        "RoleDescription": "This is test role for sanity purpose and should not be iused at all any where!!!",
        "RoleDefinitionCode": "A0202",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/2214"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 2215,
        "RoleName": "hildetest",
        "RoleDescription": "testrolle",
        "RoleDefinitionCode": "A0206",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/2215"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 2374,
        "RoleName": "Primærnæring og næringsmiddel",
        "RoleDescription": "Denne rollen gir rettighet til tjenester innen import, foredling, produksjon og/eller salg av primærnæringsprodukter og andre næringsmiddel, samt dyrehold, akvakultur, planter og kosmetikk. Ved regelverksendringer eller innføring av nye digitale tjenester",
        "RoleDefinitionCode": "A0212",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 143, 155, 156, 158, 160],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/2374"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 2375,
        "RoleName": "Rapporter TTD",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv for TTD",
        "RoleDefinitionCode": "A0214",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/2375"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 3000,
        "RoleName": "Rapporter Helsedirektoratet",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv for Helsedirektoratet",
        "RoleDefinitionCode": "A0215",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/3000"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 3154,
        "RoleName": "SSB-InnFin",
        "RoleDescription": "Tjenesteierrolle som SSB skal bruke til å få tilgang til alle InnFin skjema",
        "RoleDefinitionCode": "A0216",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/3154"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 5795,
        "RoleName": "Statens sivilrettsforvaltning vergemål",
        "RoleDescription": "Statens sivilrettsforvaltning, vergemål",
        "RoleDefinitionCode": "A0217",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/5795"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6151,
        "RoleName": "Rapporter for Statens Vegvesen",
        "RoleDescription": "Tjenesteeier-rolle for Statens vegvesen.",
        "RoleDefinitionCode": "A0219",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/6151"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6152,
        "RoleName": "Skjemarolle for ACN",
        "RoleDescription": "Tjenesteeier-rolle for tilgang til tjenesteeiers arkiv for Accenture test (ACN).",
        "RoleDefinitionCode": "A0218",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/6152"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6293,
        "RoleName": "SKD - teknisk tjenesteeierrolle",
        "RoleDescription": "Tilgang til generelle SKD tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0220",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/6293"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 7459,
        "RoleName": "Skattedirektoratet – Etatenes Felles Forvaltning",
        "RoleDescription": "Tilgang til tjenester knyttet til a-ordningen i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0221",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/7459"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 7499,
        "RoleName": "BUF skjema",
        "RoleDescription": "Tilgang til BUFDIR-tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0222",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/7499"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 8031,
        "RoleName": "ECKEYROLE",
        "RoleDescription": "Nøkkelrolle for virksomhetsertifikatbrukere",
        "RoleDefinitionCode": "ECKEYROLE",
        "ParentRoleDefinitionIds": [113, 117, 122, 125, 138, 139, 153, 154, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/8031"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 11522,
        "RoleName": "Parallell signering",
        "RoleDescription": "Denne rollen gir rettighet til å signere elementer fra andre avgivere.\r\n",
        "RoleDefinitionCode": "PASIG",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 153, 154, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/11522"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 11523,
        "RoleName": "Rapporter KMD",
        "RoleDescription": "Tilgang til KMD sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0223",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/11523"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13417,
        "RoleName": "SKD - Særavgifter",
        "RoleDescription": "Tilgang til tjenester knyttet til tjenestene som omfatter Toll og Avgift",
        "RoleDefinitionCode": "A0235",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13417"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13611,
        "RoleName": "BR Løsøre",
        "RoleDescription": "Tjenesteeierrolle for Løsøreregisteret",
        "RoleDefinitionCode": "A0245",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13611"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13612,
        "RoleName": "Post/arkiv",
        "RoleDescription": "Denne rollen gir rettighet til å lese meldinger som blir sendt til brukerens meldingsboks. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0236",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 143, 152, 154, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13612"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13613,
        "RoleName": "Rapporter DIBK",
        "RoleDescription": "Tilgang til DIBK sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0244",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13613"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13614,
        "RoleName": "Rapporter DMF",
        "RoleDescription": "Tilgang til DMF sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0242",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13614"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13615,
        "RoleName": "Rapporter Kulturrådet",
        "RoleDescription": "Tilgang til Kulturrådet sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0243",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13615"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13684,
        "RoleName": "Ansvarlig revisor",
        "RoleDescription": "Delegerbar revisorrolle med signeringsrettighet.Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0237",
        "ParentRoleDefinitionIds": [159],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13684"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13685,
        "RoleName": "Regnskapsfører lønn",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til lønnsrelaterte tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0241",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13685"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13686,
        "RoleName": "Regnskapsfører med signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester, samt signeringsrettighet for tjenestene. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0239",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13686"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13687,
        "RoleName": "Regnskapsfører uten signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0240",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13687"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13688,
        "RoleName": "Revisormedarbeider",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0238",
        "ParentRoleDefinitionIds": [159],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13688"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14483,
        "RoleName": "Rapporter Kartverket",
        "RoleDescription": "Tilgang til Kartverket sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0246",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14483"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14484,
        "RoleName": "Rapporter Kystverket",
        "RoleDescription": "Tilgang til Kystverket sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0247",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14484"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14581,
        "RoleName": "Rapporter Direktoratet for e-helse",
        "RoleDescription": "Tjenesteeierrolle for Direktoratet for e-helse",
        "RoleDefinitionCode": "A0248",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14581"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14582,
        "RoleName": "SKD - Olje og gass",
        "RoleDescription": "Tjenesteeierrolle for SKD's tjeneste for innrapportering av gassavtaler",
        "RoleDefinitionCode": "A0249",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14582"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14957,
        "RoleName": "Rapporter ELHUB",
        "RoleDescription": "Tilgang til Elhub sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0251",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14957"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 14958,
        "RoleName": "Rapporter Valgdirektoratet",
        "RoleDescription": "Tilgang til Valgdirektoratet sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0250",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/14958"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 15070,
        "RoleName": "Rapporter Datatilsynet",
        "RoleDescription": "Tilgang til Datatilsynet sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0252",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/15070"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 16752,
        "RoleName": "Rapporter Altinn videreutviklingsleverandør",
        "RoleDescription": "Tilgang til Altinn videreutviklingsleverandør sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0253",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/16752"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 16753,
        "RoleName": "Rapporter POD",
        "RoleDescription": "Rapporter POD",
        "RoleDefinitionCode": "A0254",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/16753"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 21274,
        "RoleName": "Rapporter TRA",
        "RoleDescription": "Tilgang til TRA (Tilsynsrådet for advokatvirksomhet) sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0255",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/21274"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 22524,
        "RoleName": "Rapporter NRPA",
        "RoleDescription": "Tilgang til Statens strålevern sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0258",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/22524"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 24178,
        "RoleName": "SKD - bidrag og tilbakebetaling",
        "RoleDescription": "Tilgang til tjenester knyttet til tjenestene som omfatter NAV innkreving",
        "RoleDefinitionCode": "A0259",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/24178"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 24844,
        "RoleName": "Rapporter Forsvaret",
        "RoleDescription": "Tilgang til Forsvarets tjenester i tjenesteeiers arkiv ",
        "RoleDefinitionCode": "A0260",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/24844"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 26170,
        "RoleName": "Rapporter for DSB",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv for DSB",
        "RoleDefinitionCode": "A0261",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26170"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26458,
        "RoleName": "Stifter",
        "RoleDescription": "Stifter",
        "RoleDefinitionCode": "STFT",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26458"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26459,
        "RoleName": "Den personlige konkursen angår",
        "RoleDescription": "Den personlige konkursen angår",
        "RoleDefinitionCode": "KENK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26459"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26460,
        "RoleName": "Konkursdebitor",
        "RoleDescription": "Konkursdebitor",
        "RoleDefinitionCode": "KDEB",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26460"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26461,
        "RoleName": "Varamedlem i partiets utøvende organ",
        "RoleDescription": "Varamedlem i partiets utøvende organ",
        "RoleDefinitionCode": "HVAR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26461"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26462,
        "RoleName": "Nestleder i partiets utøvende organ",
        "RoleDescription": "Nestleder i partiets utøvende organ",
        "RoleDefinitionCode": "HNST",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26462"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26463,
        "RoleName": "Styremedlem i partiets utøvende organ",
        "RoleDescription": "Styremedlem i partiets utøvende organ",
        "RoleDefinitionCode": "HMDL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26463"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26464,
        "RoleName": "Leder i partiets utøvende organ",
        "RoleDescription": "Leder i partiets utøvende organ",
        "RoleDefinitionCode": "HLED",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26464"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26465,
        "RoleName": "Elektronisk signeringsrett",
        "RoleDescription": "Elektronisk signeringsrett",
        "RoleDefinitionCode": "ESGR",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26465"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26889,
        "RoleName": "Skal fusjoneres med",
        "RoleDescription": "Skal fusjoneres med",
        "RoleDefinitionCode": "FUSJ",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26889"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26890,
        "RoleName": "Skal fisjoneres med",
        "RoleDescription": "Skal fisjoneres med",
        "RoleDefinitionCode": "FISJ",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26890"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26891,
        "RoleName": "Tildeler av elektronisk signeringsrett",
        "RoleDescription": "Tildeler av elektronisk signeringsrett",
        "RoleDefinitionCode": "ETDL",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26891"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 26892,
        "RoleName": "Administrativ enhet - offentlig sektor",
        "RoleDescription": "Administrativ enhet - offentlig sektor",
        "RoleDefinitionCode": "ADOS",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/26892"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 27142,
        "RoleName": "Rapporter Oljedirektoratet",
        "RoleDescription": "Tilgang til Oljedirektoratets tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0274",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/27142"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 27192,
        "RoleName": "Rapporter Enova",
        "RoleDescription": "Tilgang til Enovas tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0275",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/27192"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 27288,
        "RoleName": "Rapporter Statens havarikommisjon for transport",
        "RoleDescription": "Tilgang til Statens havarikommisjon for transport tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0276",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/27288"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 27348,
        "RoleName": "Rapporter STAMI",
        "RoleDescription": "Tilgang til STAMI sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0277",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/27348"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 28088,
        "RoleName": "Plan- og byggesak",
        "RoleDescription": "Rollen er forbeholdt skjemaer og tjenester som er godkjent av Direktoratet for byggkvalitet (DiBK). Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0278",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 127, 138, 139, 143, 152, 154, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/28088"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 28802,
        "RoleName": "Rapporter Helse Møre og Romsdal HF",
        "RoleDescription": "Tilgang til Helse Møre og Romsdal HF tjenester i tjenesteeiers arkiv ",
        "RoleDefinitionCode": "A0279",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/28802"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 28997,
        "RoleName": "Hovedadministrator",
        "RoleDescription": "Denne rollen gir mulighet for å delegere alle roller og rettigheter for en aktør, også de man ikke har selv. Hovedadministrator-rollen kan bare delegeres av daglig leder, styrets leder, innehaver og bestyrende reder.",
        "RoleDefinitionCode": "HADM",
        "ParentRoleDefinitionIds": [117, 125, 138, 139, 156, 160],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/28997"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 29340,
        "RoleName": "Rapporter UDIR",
        "RoleDescription": "Tilgang til UDIR sine tjenester i tjenesteeiers arkiv",
        "RoleDefinitionCode": "A0281",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/29340"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 29486,
        "RoleName": "Skatteforhold for privatpersoner",
        "RoleDescription": "Tillatelsen gjelder alle opplysninger vedrørende dine eller ditt enkeltpersonsforetaks skatteforhold. Ved regelverksendringer eller innføring av nye digitale tjenester kan Skatteetaten endre i tillatelsen.",
        "RoleDefinitionCode": "A0282",
        "ParentRoleDefinitionIds": [82],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/29486"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 29894,
        "RoleName": "Rapporter for Lillestrøm kommune",
        "RoleDescription": "Rapporter for Lillestrøm kommune",
        "RoleDefinitionCode": "A0283",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/29894"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 30312,
        "RoleName": "Hovedrolle for sensitive tjeneste",
        "RoleDescription": "Hovedrolle for sensitive tjeneste",
        "RoleDefinitionCode": "SENS",
        "ChildRoleDefinitionIds": [30330, 30710],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30312"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30313,
        "RoleName": "Taushetsbelagt post fra kommunen",
        "RoleDescription": "Rollen gir tilgang til tjenester med taushetsbelagt informasjon fra kommunen, og bør ikke delegeres i stort omfang",
        "RoleDefinitionCode": "SENS01",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30313"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30329,
        "RoleName": "Taushetsbelagt post - administrasjon",
        "RoleDescription": "Gir tilgang til taushetsbelagt post fra det offentlige innen administrasjon",
        "RoleDefinitionCode": "A0288",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30329"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30330,
        "RoleName": "Taushetsbelagt post ",
        "RoleDescription": "Denne rollen gir tilgang til taushetsbelagt post fra stat og kommune. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0286",
        "ParentRoleDefinitionIds": [30312],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30330"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30331,
        "RoleName": "Taushetsbelagt post - oppvekst og utdanning",
        "RoleDescription": "Gir tilgang til taushetsbelagt post fra det offentlige innen oppvekst og utdanning",
        "RoleDefinitionCode": "A0287",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30331"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30488,
        "RoleName": "Rapporter Norsk Helsenett",
        "RoleDescription": "Tilgang til tjenesteeiers arkiv for Norsk Helsenett",
        "RoleDefinitionCode": "A0289",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30488"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 30710,
        "RoleName": "Eksplisitt tjenestedelegering",
        "RoleDescription": "Ikke-delegerbar roller for tjenester som kun skal delegeres enkeltvis",
        "RoleDefinitionCode": "EKTJ",
        "ParentRoleDefinitionIds": [30312],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/30710"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31853,
        "RoleName": "VergeEnsligMindreårigAsylsøker",
        "RoleDescription": "VergeEnsligMindreårigAsylsøker",
        "RoleDefinitionCode": "VEMIA",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31853"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31854,
        "RoleName": "VergeEnsligMindreårigFlykning",
        "RoleDescription": "VergeEnsligMindreårigFlykning",
        "RoleDefinitionCode": "VEMIF",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31854"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31855,
        "RoleName": "VergeForvaltningUtenforVergemålPersonlig",
        "RoleDescription": "VergeForvaltningUtenforVergemålPersonlig",
        "RoleDefinitionCode": "VFUVP",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31855"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31856,
        "RoleName": "VergeForvaltningUtenforVergemålØkonomisk",
        "RoleDescription": "VergeForvaltningUtenforVergemålØkonomisk",
        "RoleDefinitionCode": "VFUVO",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31856"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31857,
        "RoleName": "VergeMidlertidigForMindreårigPersonlig",
        "RoleDescription": "VergeMidlertidigForMindreårigPersonlig",
        "RoleDefinitionCode": "VMMIP",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31857"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31858,
        "RoleName": "VergeMidlertidigForMindreårigØkonomisk",
        "RoleDescription": "VergeMidlertidigForMindreårigØkonomisk",
        "RoleDefinitionCode": "VMMIO",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31858"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31859,
        "RoleName": "VergeMidlertidigForVoksenPersonlig",
        "RoleDescription": "VergeMidlertidigForVoksenPersonlig",
        "RoleDefinitionCode": "VMVOP",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31859"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31860,
        "RoleName": "VergeMidlertidigForVoksenØkonomisk",
        "RoleDescription": "VergeMidlertidigForVoksenØkonomisk",
        "RoleDefinitionCode": "VMVOO",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31860"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31861,
        "RoleName": "VergeMindreårigPersonlig",
        "RoleDescription": "VergeMindreårigPersonlig",
        "RoleDefinitionCode": "VMIPE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31861"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31862,
        "RoleName": "VergeMindreårigØkonomisk",
        "RoleDescription": "VergeMindreårigØkonomisk",
        "RoleDefinitionCode": "VMIOK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31862"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31863,
        "RoleName": "VergeStadfestetFremtidsfullmaktPersonlig",
        "RoleDescription": "VergeStadfestetFremtidsfullmaktPersonlig",
        "RoleDefinitionCode": "VSFRP",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31863"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31864,
        "RoleName": "VergeStadfestetFremtidsfullmaktØkonomisk",
        "RoleDescription": "VergeStadfestetFremtidsfullmaktØkonomisk",
        "RoleDefinitionCode": "VSFRO",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31864"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31865,
        "RoleName": "VergeVoksenPersonlig",
        "RoleDescription": "VergeVoksenPersonlig",
        "RoleDefinitionCode": "VVOPE",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31865"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 31866,
        "RoleName": "VergeVoksenØkonomisk",
        "RoleDescription": "VergeVoksenØkonomisk",
        "RoleDefinitionCode": "VVOOK",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/31866"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 32535,
        "RoleName": "Tjenesteeier Viken fylkeskommune",
        "RoleDescription": "Tjenesteeierrolle for Viken fylkeskommune",
        "RoleDefinitionCode": "A0292",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/32535"
          }
        }
      },
      {
        "RoleType": "External",
        "RoleDefinitionId": 33770,
        "RoleName": "OED",
        "RoleDescription": "Tilgang til oppgj?r etter d?dsfall (OED)",
        "RoleDefinitionCode": "OED",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/33770"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 35232,
        "RoleName": "Algetestdata",
        "RoleDescription": "Havforskningsinstituttet - registrering av algetestdata",
        "RoleDefinitionCode": "A0293",
        "ParentRoleDefinitionIds": [117, 138, 139, 158, 160],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/35232"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 35356,
        "RoleName": "Transportløyvegaranti",
        "RoleDescription": "Statens vegvesen - rolle som gir tilgang til app for transportløyvegarantister",
        "RoleDefinitionCode": "A0294",
        "ParentRoleDefinitionIds": [117, 138, 139, 158, 160],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/35356"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37127,
        "RoleName": "Tax Form",
        "RoleDescription": "Tax Form Service Owner Role",
        "RoleDefinitionCode": "TUL01",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37127"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37128,
        "RoleName": "Private Role",
        "RoleDescription": "Test Private Role",
        "RoleDefinitionCode": "TUL02",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37128"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37129,
        "RoleName": "Secret Address",
        "RoleDescription": "Secret Address Service Owner Role",
        "RoleDefinitionCode": "TUL03",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37129"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37130,
        "RoleName": "Health Form",
        "RoleDescription": "Health Form Service Owner Role",
        "RoleDefinitionCode": "TUL04",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37130"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37500,
        "RoleName": "Programmeringsgrensesnitt (API)",
        "RoleDescription": "Delegerbar rolle som gir  tilgang til å administrere tilgang til programmeringsgrensesnitt - API, på vegne av virksomheten.",
        "RoleDefinitionCode": "APIADM",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 154, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37500"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37501,
        "RoleName": "Programmeringsgrensesnitt for NUF (API)",
        "RoleDescription": "Delegerbar rolle som gir kontaktperson for norskregistrert utenlandsk foretak (NUF) tilgang til å administrere tilgang til programmeringsgrensesnitt - API, på vegne av virksomheten.",
        "RoleDefinitionCode": "APIADMNUF",
        "ParentRoleDefinitionIds": [153],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37501"
          }
        }
      },
      {
        "RoleType": "Altinn",
        "RoleDefinitionId": 37502,
        "RoleName": "Revisorattesterer",
        "RoleDescription": "Rollen gir bruker tilgang til å attestere tjenester for avgiver som revisor.  Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0298",
        "ParentRoleDefinitionIds": [117, 122, 125, 138, 139, 143, 152, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/37502"
          }
        }
      }
    ]


