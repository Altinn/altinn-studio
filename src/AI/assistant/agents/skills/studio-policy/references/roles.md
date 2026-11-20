# LIST OF ALL POSSIBLE ROLES

List of all roles are:
all_roles = [
{
"RoleType": "Altinn",
"RoleDefinitionId": 11,
"RoleName": "Utfyller/Innsender",
"RoleDescription": "Denne rollen gir rettighet til et bredt utvalg skjema og tjenester som ikke har så strenge krav til autorisasjon. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
"RoleDefinitionCode": "UTINN",
"ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 152, 154, 155, 156, 158, 160, 161]
},

    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13686,
        "RoleName": "Regnskapsfører med signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester, samt signeringsrettighet for tjenestene. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0239",
        "ParentRoleDefinitionIds": [157]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13687,
        "RoleName": "Regnskapsfører uten signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0240",
        "ParentRoleDefinitionIds": [157]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 8,
        "RoleName": "Begrenset signeringsrettighet",
        "RoleDescription": "Tilgang til å signere utvalgte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "SISKD",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 143, 151, 152, 155, 156, 158, 160, 161]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6,
        "RoleName": "Regnskapsmedarbeider",
        "RoleDescription": "Denne rollen gir rettighet til regnskapsrelaterte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "REGNA",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 150, 151, 152, 155, 156, 158, 160, 161]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13684,
        "RoleName": "Ansvarlig revisor",
        "RoleDescription": "Delegerbar revisorrolle med signeringsrettighet.Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0237",
        "ParentRoleDefinitionIds": [159]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13688,
        "RoleName": "Revisormedarbeider",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0238",
        "ParentRoleDefinitionIds": [159]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13685,
        "RoleName": "Regnskapsfører lønn",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til lønnsrelaterte tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0241",
        "ParentRoleDefinitionIds": [157]
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 7,
        "RoleName": "Revisorrettighet",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester",
        "RoleDefinitionCode": "REVAI"
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 153,
        "RoleName": "Kontaktperson for NUF",
        "RoleDescription": "Kontaktperson for norskregistrert utenlandsk foretak. Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KNUF",
        "ChildRoleDefinitionIds": [4, 8031, 11522, 37501]
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 83,
        "RoleName": "Selvregistrert bruker",
        "RoleDescription": "Selvregistrert bruker",
        "RoleDefinitionCode": "SELN"
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 160,
        "RoleName": "Daglig leder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "DAGL",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502]
    },

]
