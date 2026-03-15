# Altinn 3 App Frontend — Komplett Feature-Map

> Denne dokumentasjonen dekker alle funksjoner, datastrukturer, API-endepunkter, uttrykksspråk og komponentdefinisjoner i Altinn 3 App Frontend. Dokumentasjonen er skrevet for å muliggjøre en fullstendig reimplementering av applikasjonen.

---

## Innholdsfortegnelse

1. [Arkitekturoversikt](#1-arkitekturoversikt)
2. [App-moduser](#2-app-moduser)
3. [Konfigurasjonsfiler og JSON-skjemaer](#3-konfigurasjonsfiler-og-json-skjemaer)
4. [Layout-systemet](#4-layout-systemet)
5. [Komponentkatalog](#5-komponentkatalog)
6. [Uttrykksspråket (Expressions)](#6-uttrykksspråket-expressions)
7. [Datamodellbindinger](#7-datamodellbindinger)
8. [Tekstressurser og i18n](#8-tekstressurser-og-i18n)
9. [API-endepunkter](#9-api-endepunkter)
10. [Skjemadata og lagring](#10-skjemadata-og-lagring)
11. [Validering](#11-validering)
12. [Filvedlegg](#12-filvedlegg)
13. [Prosessflyt](#13-prosessflyt)
14. [Betaling](#14-betaling)
15. [PDF-generering](#15-pdf-generering)
16. [Autentisering og autorisasjon](#16-autentisering-og-autorisasjon)
17. [Navigasjon](#17-navigasjon)
18. [Options og kodelister](#18-options-og-kodelister)
19. [Footer-konfigurasjon](#19-footer-konfigurasjon)
20. [Grid og responsivt layout](#20-grid-og-responsivt-layout)
21. [Oppsummering (Summary)](#21-oppsummering-summary)
22. [Feilhåndtering](#22-feilhåndtering)
23. [Ytelsesoptimalisering](#23-ytelsesoptimalisering)
24. [Edge Cases og spesialhåndtering](#24-edge-cases-og-spesialhåndtering)
25. [Motstridende konfigurasjon](#25-motstridende-konfigurasjon)

---

## 1. Arkitekturoversikt

### Hva applikasjonen gjør

Altinn 3 App Frontend er en React-applikasjon som renderer dynamiske skjemaer for norske offentlige tjenester. Den:

- Leser layout-konfigurasjon (JSON) fra en .NET-backend
- Renderer UI-komponenter basert på konfigurasjonen
- Evaluerer dynamiske uttrykk for synlighet, skrivebeskyttelse, påkrevdhet
- Lagrer skjemadata mot backend via REST API
- Håndterer filopplasting, validering, prosessflyt, betaling og PDF-generering
- Støtter flerspråklighet (nb, nn, en)

### Teknologistabel

| Lag            | Teknologi                                   |
| -------------- | ------------------------------------------- |
| UI-rammeverk   | React 18, TypeScript                        |
| Server-state   | TanStack Query (React Query)                |
| Lokal state    | Zustand (wrappet i React Context)           |
| HTTP-klient    | Axios                                       |
| Styling        | CSS Modules + Digdir Design System          |
| Bygg           | Webpack (planlagt migrering til Vite)       |
| Testing        | Jest + React Testing Library                |
| E2E            | Cypress (planlagt migrering til Playwright) |
| Pakkebehandler | Yarn 4 med Corepack                         |

### Mappestruktur

```
src/
├── app-components/          # Gjenbrukbare UI-komponenter (wrapper rundt Designsystemet)
├── codegen/                 # Kodegenereringssystem fra JSON-skjemaer
├── components/              # Felleskomponenter (header, footer, feilhåndtering)
├── core/                    # Kjerneinfrastruktur (contexts, routing, queries)
├── features/                # Feature-moduler organisert etter domene
│   ├── applicationMetadata/ # App-konfigurasjon fra backend
│   ├── attachments/         # Filvedlegg-håndtering
│   ├── expressions/         # Uttrykksevaluering
│   ├── form/                # Skjemalogikk (dynamics, layout, navigation)
│   ├── formData/            # Skjemadata-håndtering (lagring, debouncing)
│   ├── instance/            # Instanslivssyklus
│   ├── language/            # Flerspråklighet
│   ├── payment/             # Betalingsfunksjonalitet
│   ├── pdf/                 # PDF-generering
│   └── validation/          # Valideringslogikk
├── layout/                  # Layout-komponenter (én mappe per komponenttype)
├── queries/                 # API-spørringer og mutasjoner
├── test/                    # Testhjelpere og mocks
└── utils/                   # Verktøyfunksjoner
```

---

## 2. App-moduser

Applikasjonen opererer i tre distinkte moduser som påvirker dataflyt, API-endepunkter og tilgjengelig funksjonalitet.

### 2.1 Stateful (instansbasert)

**Bruk:** Flertrinns skjemaer med persistens, prosessflyt og dokumenthåndtering.

- URL-mønster: `/{org}/{app}/#/instance/{partyId}/{instanceGuid}`
- Data lagres som `IData`-elementer på en `IInstance`
- Støtter prosesstrinn (tasks), signering, innsending
- Lagring via JSON Patch (RFC 6902) mot `PATCH /instances/{id}/data`
- Støtter multi-patch (atomisk oppdatering av flere datamodeller)
- Filopplasting, tags, validering, PDF-generering

### 2.2 Stateless (innlogget)

**Bruk:** Enkeltsteg-skjemaer uten persistens, bruker er innlogget.

- URL-mønster: `/{org}/{app}/`
- Ingen instans opprettes — data lagres mot `/v1/data?dataType={type}`
- Lagring via `POST` med full datakropp (ikke patches)
- Valgfri party-header: `party: partyid:{partyId}`
- Støtter prefill fra URL-parametere
- Ingen prosesstrinn

### 2.3 Anonym stateless

**Bruk:** Offentlige skjemaer uten autentisering.

- URL-mønster: `/{org}/{app}/`
- Ingen autentisering kreves
- Data lagres mot `/v1/data/anonymous?dataType={type}`
- Ingen party/bruker-kontekst
- Ingen prefill fra URL (sikkerhetshensyn)

### Sammenligning

| Funksjon        | Stateful               | Stateless         | Anonym               |
| --------------- | ---------------------- | ----------------- | -------------------- |
| Instans         | Ja                     | Nei               | Nei                  |
| Prosesstrinn    | Ja                     | Nei               | Nei                  |
| Autentisering   | Påkrevd                | Påkrevd           | Ikke påkrevd         |
| Party-valg      | Påkrevd                | Valgfri           | N/A                  |
| Data-endepunkt  | `/instances/{id}/data` | `/v1/data`        | `/v1/data/anonymous` |
| Lagringsmetode  | PATCH (JSON Patch)     | POST (full kropp) | POST (full kropp)    |
| Multi-patch     | Ja                     | Nei               | Nei                  |
| Prefill fra URL | Nei                    | Ja                | Nei                  |
| Filopplasting   | Ja                     | Nei               | Nei                  |
| Signering       | Ja                     | Nei               | Nei                  |

---

## 3. Konfigurasjonsfiler og JSON-skjemaer

### 3.1 Application Metadata (`applicationmetadata.json`)

Definerer grunnleggende app-konfigurasjon. Hentes fra `/api/v1/applicationmetadata`.

```json
{
  "id": "org/app-name",
  "org": "organisasjon",
  "title": { "nb": "Tittel", "en": "Title" },
  "dataTypes": [
    {
      "id": "model",
      "taskId": "Task_1",
      "maxCount": 1,
      "minCount": 1,
      "appLogic": {
        "autoCreate": true,
        "classRef": "App.Models.DataModel",
        "allowAnonymousOnStateless": false
      },
      "allowedContentTypes": ["application/xml"],
      "enablePdfCreation": true,
      "enableFileScan": false
    },
    {
      "id": "attachment",
      "taskId": "Task_1",
      "maxCount": 15,
      "maxSize": 25,
      "allowedContentTypes": ["application/pdf", "image/png"]
    }
  ],
  "partyTypesAllowed": {
    "person": true,
    "organisation": true,
    "subUnit": false,
    "bankruptcyEstate": false
  },
  "onEntry": {
    "show": "new-instance",
    "instanceSelection": {
      "sortDirection": "desc",
      "rowsPerPageOptions": [10, 25, 50],
      "defaultSelectedOption": 0
    }
  },
  "autoDeleteOnProcessEnd": false,
  "logo": {
    "source": "org",
    "displayAppOwnerNameInHeader": true,
    "size": "small"
  }
}
```

**Nøkkelegenskaper:**

- `dataTypes[]` — Definerer alle datatyper (skjemadata + vedlegg)
- `partyTypesAllowed` — Hvem kan opprette instanser
- `onEntry.show` — Hva vises ved oppstart (`new-instance`, `select-instance`, layoutSetId)
- `logo` — Organisasjonslogo (`org` fra Altinn, `resource` fra tekstressurser)
- `copyInstanceSettings` — Kopier instansdata mellom instanser
- `eFormidling` — Integrasjon med eFormidling (DPO, DPV, DPF, DPI)
- `apiScopes` — Egendefinerte API-scopes for tilgang

### 3.2 Layout Sets (`layout-sets.json`)

Definerer tilgjengelige layout-sett. Hentes fra `/api/layoutsets`.

```json
{
  "sets": [
    { "id": "form", "dataType": "model", "tasks": ["Task_1"] },
    { "id": "signing", "dataType": "model", "tasks": ["Task_2"] }
  ],
  "uiSettings": {
    "hideCloseButton": false,
    "showLanguageSelector": true,
    "showProgress": true,
    "autoSaveBehavior": "onChangeFormData"
  }
}
```

### 3.3 Layout Settings (`Settings.json`)

Sideorden og globale innstillinger per layout-sett. Hentes fra `/api/layoutsettings/{layoutSetId}`.

```json
{
  "pages": {
    "order": ["page1", "page2", "page3"],
    "excludeFromPdf": ["page3"],
    "pdfLayoutName": "custom-pdf-layout"
  },
  "components": {
    "excludeFromPdf": ["debug-component"]
  }
}
```

**Alternativ med gruppert navigasjon:**

```json
{
  "pages": {
    "groups": [
      { "name": "Personalia", "order": ["page1", "page2"] },
      { "name": "Vedlegg", "order": ["page3"] }
    ]
  }
}
```

**Globale UI-innstillinger:**

- `hideCloseButton` — Skjul lukk-knapp
- `showLanguageSelector` — Vis språkvelger
- `showExpandWidthButton` — Vis breddeknapp
- `expandedWidth` — Start med utvidet bredde
- `showProgress` — Vis fremdriftsindikator
- `autoSaveBehavior` — `onChangeFormData` (standard) eller `onChangePage`
- `taskNavigation` — Sidebar-navigasjon mellom prosesstrinn

### 3.4 Layout-filer (`{pageName}.json`)

Definerer sideinnhold. Hentes fra `/api/layouts/{layoutSetId}`.

```json
{
  "$schema": "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
  "data": {
    "layout": [
      {
        "id": "firstName",
        "type": "Input",
        "dataModelBindings": { "simpleBinding": "person.firstName" },
        "textResourceBindings": { "title": "Fornavn" },
        "required": true,
        "readOnly": false
      }
    ],
    "hidden": false,
    "navigation": { "next": "page2" }
  }
}
```

---

## 4. Layout-systemet

### 4.1 Layout-fil-struktur

Hver layout-fil (`ILayoutFile`) har:

- `data.layout[]` — Array av komponentdefinisjoner
- `data.hidden` — Boolsk uttrykk for å skjule hele siden
- `data.navigation` — Referanser til neste/forrige side

### 4.2 Komponentbase

Alle komponenter arver fra `ComponentBase`:

| Egenskap    | Type                             | Beskrivelse                                             |
| ----------- | -------------------------------- | ------------------------------------------------------- |
| `id`        | `string` (påkrevd)               | Unik komponent-ID. Mønster: `^[0-9a-zA-Z][0-9a-zA-Z-]*` |
| `type`      | `string` (påkrevd)               | Komponenttype (f.eks. `Input`, `Dropdown`)              |
| `hidden`    | `boolean \| Expression<Boolean>` | Synlighet (standard: `false`)                           |
| `grid`      | `IGrid`                          | Responsivt grid-oppsett                                 |
| `pageBreak` | `IPageBreak`                     | PDF-sideskift (`breakBefore`, `breakAfter`)             |

### 4.3 Skjemakomponent-tillegg (FormComponentProps)

Skjemakomponenter arver i tillegg:

| Egenskap                          | Type                             | Beskrivelse                         |
| --------------------------------- | -------------------------------- | ----------------------------------- |
| `readOnly`                        | `boolean \| Expression<Boolean>` | Skrivebeskyttet (standard: `false`) |
| `required`                        | `boolean \| Expression<Boolean>` | Påkrevd (standard: `false`)         |
| `triggers`                        | `Triggers[]`                     | Valideringsutløsere                 |
| `renderAsSummary`                 | `boolean \| Expression<Boolean>` | Vis som oppsummering                |
| `labelSettings.optionalIndicator` | `boolean`                        | Vis "(valgfri)"-indikator           |

### 4.4 Komponentkategorier

| Kategori         | Beskrivelse                                  | Eksempler                        |
| ---------------- | -------------------------------------------- | -------------------------------- |
| **Form**         | Binder til datamodell, tar imot brukerinnput | Input, Dropdown, Checkboxes      |
| **Presentation** | Viser informasjon, ingen databinding         | Header, Paragraph, Alert         |
| **Action**       | Knapper og handlinger                        | Button, ActionButton, Link       |
| **Container**    | Inneholder barn-komponenter                  | Group, RepeatingGroup, Accordion |

### 4.5 Rendreringskapabiliteter

Hver komponent definerer hvor den kan rendres:

| Kapabilitet              | Beskrivelse                          |
| ------------------------ | ------------------------------------ |
| `renderInTable`          | I repeterende gruppers tabellvisning |
| `renderInButtonGroup`    | I knappgrupper                       |
| `renderInAccordion`      | I trekkspill                         |
| `renderInAccordionGroup` | I trekkspillgrupper                  |
| `renderInCards`          | I kort-layout                        |
| `renderInCardsMedia`     | Som medieelement i kort              |
| `renderInTabs`           | I fane-layout                        |

---

## 5. Komponentkatalog

### 5.1 Skjemakomponenter

#### Input

Tekstfelt for enkeltlinje-input.

```json
{
  "id": "name",
  "type": "Input",
  "dataModelBindings": { "simpleBinding": "person.name" },
  "textResourceBindings": { "title": "Navn", "description": "Skriv inn fullt navn" },
  "required": true,
  "readOnly": false,
  "saveWhileTyping": 400,
  "maxLength": 100,
  "autocomplete": "name",
  "variant": "text",
  "formatting": {
    "number": { "thousandSeparator": " ", "decimalSeparator": "," }
  }
}
```

| Egenskap          | Type                 | Standard | Beskrivelse                 |
| ----------------- | -------------------- | -------- | --------------------------- |
| `saveWhileTyping` | `boolean \| number`  | `400`    | Lagre under skriving (ms)   |
| `formatting`      | `IFormatting`        | —        | Tall/valuta-formatering     |
| `variant`         | `"text" \| "search"` | `"text"` | Visuell variant             |
| `autocomplete`    | `string`             | —        | HTML autocomplete-attributt |
| `maxLength`       | `number`             | —        | Maks tegn (med teller)      |

#### TextArea

Flerlinje-tekstfelt.

| Egenskap          | Type                | Standard | Beskrivelse          |
| ----------------- | ------------------- | -------- | -------------------- |
| `saveWhileTyping` | `boolean \| number` | `400`    | Lagre under skriving |
| `maxLength`       | `number`            | —        | Maks tegn            |
| `autocomplete`    | `string`            | —        | HTML autocomplete    |

#### Number

Tallinnput med formatering og uttrykksstøtte.

#### Datepicker

Datovelger.

| Egenskap    | Type      | Standard                     | Beskrivelse                            |
| ----------- | --------- | ---------------------------- | -------------------------------------- |
| `minDate`   | `string`  | `"1900-01-01T12:00:00.000Z"` | Tidligste dato (`"today"` støttet)     |
| `maxDate`   | `string`  | `"2100-01-01T12:00:00.000Z"` | Seneste dato (`"today"` støttet)       |
| `timeStamp` | `boolean` | `true`                       | ISO 8601 vs YYYY-MM-DD                 |
| `format`    | `string`  | —                            | Visuelt format (f.eks. `"DD.MM.YYYY"`) |

#### TimePicker

Tidsvelger med min/maks-grenser og format (`HH:mm` eller `hh:mm a`).

#### Dropdown

Enkel-valg nedtrekksmeny.

```json
{
  "id": "country",
  "type": "Dropdown",
  "dataModelBindings": { "simpleBinding": "address.country" },
  "optionsId": "countries",
  "queryParameters": { "region": "europe" },
  "preselectedOptionIndex": 0,
  "secure": false
}
```

#### Checkboxes

Flervalg med avkryssningsbokser.

| Egenskap           | Type                                                  | Standard   | Beskrivelse    |
| ------------------ | ----------------------------------------------------- | ---------- | -------------- |
| `layout`           | `"column" \| "row" \| "table"`                        | `"column"` | Visuell layout |
| Options-egenskaper | Se [Options og kodelister](#18-options-og-kodelister) |            |                |

#### RadioButtons

Enkelvalg med radioknapper.

| Egenskap     | Type                           | Standard   | Beskrivelse    |
| ------------ | ------------------------------ | ---------- | -------------- |
| `layout`     | `"column" \| "row" \| "table"` | `"column"` | Visuell layout |
| `showAsCard` | `boolean`                      | `false`    | Vis som kort   |

#### MultipleSelect

Flervalg med nedtrekksmeny.

#### Address (AddressComponent)

Adresse-komponent med flere felter.

```json
{
  "id": "address",
  "type": "AddressComponent",
  "dataModelBindings": {
    "address": "address.street",
    "zipCode": "address.zip",
    "postPlace": "address.city",
    "careOf": "address.careOf",
    "houseNumber": "address.houseNumber"
  },
  "simplified": true,
  "saveWhileTyping": 400
}
```

| Binding       | Påkrevd | Beskrivelse |
| ------------- | ------- | ----------- |
| `address`     | Ja      | Gateadresse |
| `zipCode`     | Ja      | Postnummer  |
| `postPlace`   | Ja      | Poststed    |
| `careOf`      | Nei     | C/O-felt    |
| `houseNumber` | Nei     | Husnummer   |

#### FileUpload

Filopplasting.

```json
{
  "id": "vedlegg",
  "type": "FileUpload",
  "maxFileSizeInMB": 25,
  "maxNumberOfAttachments": 10,
  "minNumberOfAttachments": 1,
  "displayMode": "list",
  "hasCustomFileEndings": true,
  "validFileEndings": [".pdf", ".png", ".jpg"],
  "alertOnDelete": true
}
```

#### FileUploadWithTag

Filopplasting med tag-velger (krever `optionsId` for tags).

#### ImageUpload

Bildeopplasting med beskjæring (sirkel/rektangel).

#### Likert

Likert-skala matrise med spørsmål/svar-struktur.

#### Map

Kartkkomponent med GeoJSON/WKT-støtte, lag (TileLayer/WMS), senter og zoom.

#### List

Dataliste med paginering, sortering og spørreparametere.

| Egenskap          | Type          | Påkrevd | Beskrivelse              |
| ----------------- | ------------- | ------- | ------------------------ |
| `dataListId`      | `string`      | Ja      | ID for henting av data   |
| `tableHeaders`    | `object`      | Ja      | Kolonneoverskrifter      |
| `sortableColumns` | `string[]`    | Nei     | Sorterbare kolonner      |
| `pagination`      | `IPagination` | Nei     | Pagineringskonfigurasjon |

#### PersonLookup / OrganisationLookup

Oppslag av person (fødselsnummer/navn) eller organisasjon (orgnummer).

#### Subform

Nestet skjema-layout med egen data-type og add/delete-funksjonalitet.

#### SimpleTable

Tabellvisning med kolonner, lenker, datoer og radioknapper.

#### AddToList

Knapp for å legge til elementer i repeterende gruppe.

#### Custom

Egendefinert webkomponent med `tagName` og dynamiske bindinger.

### 5.2 Presentasjonskomponenter

#### Header

Overskrift med størrelse og hjelpetekst.

| Egenskap | Verdier                                     | Påkrevd |
| -------- | ------------------------------------------- | ------- |
| `size`   | `"L"`, `"M"`, `"S"`, `"h2"`, `"h3"`, `"h4"` | Ja      |

#### Paragraph

Tekstparagraf med hjelpetekst-støtte.

#### Text

Tekstvisning med uttrykk, retning og ikon.

#### Alert

Varselboks.

| Egenskap   | Verdier                                        | Påkrevd |
| ---------- | ---------------------------------------------- | ------- |
| `severity` | `"success"`, `"warning"`, `"danger"`, `"info"` | Ja      |

#### Panel

Sammenleggbart/utvidbart panel.

| Egenskap   | Verdier                                       | Standard |
| ---------- | --------------------------------------------- | -------- |
| `variant`  | `"info"`, `"warning"`, `"error"`, `"success"` | `"info"` |
| `showIcon` | `boolean`                                     | `true`   |

#### Image / Audio / Video

Medieelementer med språkspesifikke kilder og alternativtekst.

#### IFrame

Innebygd iframe.

| Egenskap                             | Type      | Beskrivelse           |
| ------------------------------------ | --------- | --------------------- |
| `sandbox.allowPopups`                | `boolean` | Tillat popups         |
| `sandbox.allowPopupsToEscapeSandbox` | `boolean` | Tillat sandbox-unntak |

#### Divider

Visuell skillelinje.

#### AttachmentList

Viser liste over vedlegg med valgfri gruppering.

#### InstanceInformation

Viser instansmetadata (dato sendt, avsender, mottaker, referansenummer).

#### SigneeList / SigningDocumentList

Viser signerere og dokumenter for signering.

### 5.3 Handlingskomponenter

#### Button

Standard submit/save-knapp.

| Egenskap | Verdier                                               | Standard   |
| -------- | ----------------------------------------------------- | ---------- |
| `mode`   | `"submit"`, `"save"`, `"go-to-task"`, `"instantiate"` | `"submit"` |

#### CustomButton

Egendefinert handlingsknapp med `actions`-array (ClientAction/ServerAction).

#### ActionButton

Prosesshandling-knapp.

| Egenskap      | Verdier                                            | Påkrevd |
| ------------- | -------------------------------------------------- | ------- |
| `action`      | `"instantiate"`, `"confirm"`, `"sign"`, `"reject"` | Ja      |
| `buttonStyle` | `"primary"`, `"secondary"`                         | Ja      |

#### Link

Hyperlenke med stil og nye-faner-støtte.

| Egenskap       | Verdier                              | Standard |
| -------------- | ------------------------------------ | -------- |
| `style`        | `"primary"`, `"secondary"`, `"link"` | —        |
| `openInNewTab` | `boolean`                            | `false`  |

#### NavigationButtons

Forrige/neste-knapper med valgfri tilbake-knapp og valideringsutløsere.

#### PrintButton / PDFPreviewButton

Utskrifts- og PDF-forhåndsvisningsknapper.

#### InstantiationButton

Oppretter ny instans med valgfri mapping.

#### SigningActions

Signeringsflyt-knapper med omfattende tekstressurser for ulike signeringstilstander.

### 5.4 Container-komponenter

#### Group

Grupperer komponenter med tittel og grupperings-indikator.

```json
{
  "id": "personal-info",
  "type": "Group",
  "children": ["firstName", "lastName", "email"],
  "textResourceBindings": { "title": "Personopplysninger" },
  "groupingIndicator": "indented"
}
```

| Egenskap            | Type                    | Beskrivelse         |
| ------------------- | ----------------------- | ------------------- |
| `children`          | `string[]`              | Barn-komponent-IDer |
| `groupingIndicator` | `"indented" \| "panel"` | Visuell gruppering  |
| `headingLevel`      | `2-6`                   | Overskriftsnivå     |

#### RepeatingGroup (Group med `maxCount >= 2`)

Repeterende gruppe med rad-operasjoner.

```json
{
  "id": "persons",
  "type": "Group",
  "children": ["name", "age"],
  "maxCount": 99,
  "minCount": 1,
  "dataModelBindings": { "group": "persons" },
  "edit": {
    "mode": "showTable",
    "addButton": true,
    "deleteButton": true,
    "editButton": true,
    "saveButton": true,
    "multiPage": false,
    "openByDefault": "first",
    "alertOnDelete": true,
    "alwaysShowAddButton": false
  },
  "tableHeaders": ["name", "age"],
  "tableColumns": {
    "name": { "width": "60%" },
    "age": { "width": "40%", "alignText": "right" }
  }
}
```

**Edit-moduser:**

- `hideTable` — Skjul tabell, vis kun redigering
- `showTable` — Vis tabell + redigering ved klikk
- `showAll` — Vis alle rader i redigeringsmodus
- `onlyTable` — Kun tabellvisning (ingen redigering)
- `likert` — Likert-skala-modus

**Spesialegenskaper:**

- `hiddenRow` — Uttrykk for å skjule individuelle rader
- `rowsBefore` / `rowsAfter` — Ekstra grid-rader rundt tabellen
- `pagination` — Paginering av rader

#### Accordion / AccordionGroup

Sammenleggbare seksjoner med valgfri `openByDefault`.

#### Grid

Tabellbasert layout med rader og celler.

```json
{
  "id": "info-grid",
  "type": "Grid",
  "rows": [
    { "header": true, "cells": [{ "text": "Felt" }, { "text": "Verdi" }] },
    { "cells": [{ "text": "Navn" }, { "component": "nameInput" }] }
  ]
}
```

#### Tabs

Fanebasert container med størrelse og standard-fane.

#### Cards

Kortbasert layout med medieelementer.

#### ButtonGroup

Grupperer knapper med felles label.

---

## 6. Uttrykksspråket (Expressions)

### 6.1 Oversikt

Uttrykksspråket er et mini-språk i JSON-array-format som evalueres dynamisk ved runtime. Det brukes for å styre synlighet, skrivebeskyttelse, påkrevdhet, tekstinnhold og mer.

**Format:** `["funksjonsnavn", arg1, arg2, ...]`

**Eksempel:**

```json
["if", ["greaterThan", ["dataModel", "person.age"], 18], "Voksen", "else", "Mindreårig"]
```

### 6.2 Hvor uttrykk kan brukes

| Egenskap                           | Returtype | Komponent                  |
| ---------------------------------- | --------- | -------------------------- |
| `hidden`                           | Boolean   | Alle komponenter + sider   |
| `readOnly`                         | Boolean   | Skjemakomponenter          |
| `required`                         | Boolean   | Skjemakomponenter          |
| `renderAsSummary`                  | Boolean   | Oppsummerbare komponenter  |
| `textResourceBindings.*`           | String    | Alle med tekstbindinger    |
| `pageBreak.breakBefore/breakAfter` | String    | Alle komponenter           |
| `alertOnDelete`                    | Boolean   | FileUpload, RepeatingGroup |
| `edit.addButton/deleteButton/etc.` | Boolean   | RepeatingGroup             |
| `hiddenRow`                        | Boolean   | RepeatingGroup             |

### 6.3 Datakilder (Lookup-funksjoner)

| Funksjon                                | Returtype | Beskrivelse                                                 |
| --------------------------------------- | --------- | ----------------------------------------------------------- |
| `["component", "id"]`                   | Any       | Verdien av en komponents `simpleBinding`                    |
| `["dataModel", "path", "dataType?"]`    | Any       | Verdi fra datamodellen (punktnotasjon)                      |
| `["instanceContext", "prop"]`           | String    | `appId`, `instanceId`, `instanceOwnerPartyId`               |
| `["authContext", "perm"]`               | Boolean   | `read`, `write`, `instantiate`, `confirm`, `sign`, `reject` |
| `["frontendSettings", "key"]`           | Any       | Skalarverdier fra frontend-innstillinger                    |
| `["externalApi", "apiId", "path"]`      | String    | Verdi fra ekstern API (punktnotasjon)                       |
| `["displayValue", "componentId"]`       | String    | Formatert visningsverdi av komponent                        |
| `["countDataElements", "dataType"]`     | Number    | Antall dataelementer av gitt type                           |
| `["optionLabel", "optionsId", "value"]` | String    | Label for en option-verdi i en kodeliste                    |

### 6.4 Sammenligningsfunksjoner (→ Boolean)

| Funksjon        | Argumenter             | Beskrivelse               |
| --------------- | ---------------------- | ------------------------- |
| `equals`        | `(any, any)`           | Likhet (case-insensitivt) |
| `notEquals`     | `(any, any)`           | Ulikhet                   |
| `greaterThan`   | `(number, number)`     | Større enn                |
| `greaterThanEq` | `(number, number)`     | Større enn eller lik      |
| `lessThan`      | `(number, number)`     | Mindre enn                |
| `lessThanEq`    | `(number, number)`     | Mindre enn eller lik      |
| `compare`       | `(any, operator, any)` | Generisk sammenligning    |

**Compare-operatorer:** `equals`, `greaterThan`, `greaterThanEq`, `lessThan`, `lessThanEq`, `isAfter`, `isBefore`, `isAfterEq`, `isBeforeEq`, `isSameDay`

### 6.5 Logiske funksjoner (→ Boolean)

| Funksjon        | Argumenter              | Beskrivelse                 |
| --------------- | ----------------------- | --------------------------- |
| `and`           | `(bool, bool, ...rest)` | Sann hvis alle er sanne     |
| `or`            | `(bool, bool, ...rest)` | Sann hvis minst én er sann  |
| `not`           | `(bool)`                | Inverterer boolsk verdi     |
| `contains`      | `(string, string)`      | Delstreng-sjekk             |
| `notContains`   | `(string, string)`      | Invers delstreng            |
| `startsWith`    | `(string, string)`      | Starter med                 |
| `endsWith`      | `(string, string)`      | Slutter med                 |
| `commaContains` | `(string, string)`      | Sjekker kommaseparert liste |

### 6.6 Strengfunksjoner (→ String)

| Funksjon         | Argumenter                  | Beskrivelse                        |
| ---------------- | --------------------------- | ---------------------------------- |
| `concat`         | `(string, ...rest)`         | Slår sammen strenger               |
| `lowerCase`      | `(string)`                  | Til små bokstaver                  |
| `upperCase`      | `(string)`                  | Til store bokstaver                |
| `lowerCaseFirst` | `(string)`                  | Første tegn til liten              |
| `upperCaseFirst` | `(string)`                  | Første tegn til stor               |
| `stringReplace`  | `(string, search, replace)` | Erstatt alle forekomster           |
| `stringSlice`    | `(string, start, end)`      | Delstreng (støtter negativ indeks) |

### 6.7 Tall- og datofunksjoner

| Funksjon        | Argumenter            | Returtype | Beskrivelse         |
| --------------- | --------------------- | --------- | ------------------- |
| `round`         | `(number, decimals?)` | String    | Avrunding           |
| `formatDate`    | `(date, format?)`     | String    | Datoformatering     |
| `stringLength`  | `(string)`            | Number    | Strenglengde        |
| `stringIndexOf` | `(string, search)`    | Number    | Indeks av delstreng |

### 6.8 Tekst- og navigasjonsfunksjoner

| Funksjon          | Argumenter                         | Beskrivelse                            |
| ----------------- | ---------------------------------- | -------------------------------------- |
| `text`            | `(key)`                            | Henter tekstressurs etter nøkkel       |
| `language`        | `()`                               | Nåværende språkkode (`nb`, `nn`, `en`) |
| `linkToComponent` | `(text, componentId, enableBack?)` | HTML-lenke til komponent               |
| `linkToPage`      | `(text, pageId, enableBack?)`      | HTML-lenke til side                    |

### 6.9 Kontekstfunksjoner (kun validering)

| Funksjon      | Beskrivelse                            |
| ------------- | -------------------------------------- |
| `argv(index)` | Posisjonsargument i valideringsuttrykk |
| `value(key?)` | Navngitte verdiargumenter i validering |

### 6.10 Typesystem

Uttrykk har et strengt typesystem med automatisk casting:

| ExprVal-type | TypeScript-type                       | Casting tillatt fra                                            |
| ------------ | ------------------------------------- | -------------------------------------------------------------- |
| Boolean      | `boolean`                             | boolean, string (`"true"`/`"false"`/`"1"`/`"0"`), number (1/0) |
| String       | `string`                              | string, number, boolean                                        |
| Number       | `number`                              | number, numerisk string                                        |
| Date         | `ExprDate`                            | ISO 8601-strenger                                              |
| Any          | `string \| number \| boolean \| null` | Alle                                                           |

### 6.11 Feilhåndtering

- Feil i uttrykk logges med full kontekst (sti til feilpunkt)
- Komponenten mottar standardverdi i stedet for å krasje
- Layout fortsetter å rendres med fallback-oppførsel

---

## 7. Datamodellbindinger

### 7.1 Bindingstyper

| Type                              | Felter                                                       | Brukt av                           |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| `IDataModelBindingsSimple`        | `simpleBinding`                                              | Input, TextArea, Datepicker, etc.  |
| `IDataModelBindingsOptionsSimple` | `simpleBinding`, `metadata?`                                 | Dropdown, Checkboxes, RadioButtons |
| `IDataModelBindingsList`          | `list`                                                       | List-baserte komponenter           |
| `IDataModelBindingsForGroup`      | `group`                                                      | RepeatingGroup                     |
| `IDataModelBindingsForAddress`    | `address`, `zipCode`, `postPlace`, `careOf?`, `houseNumber?` | AddressComponent                   |
| `IDataModelBindingsForCustom`     | Vilkårlige nøkler                                            | Custom                             |
| `IDataModelBindingsLikert`        | `answer`, `questions`                                        | Likert                             |

### 7.2 Datamodellreferanse

```typescript
interface IDataModelReference {
  dataType: string; // Navn på datatype
  field: string; // Punktnotasjon-sti til felt
}
```

### 7.3 Repeterende grupper og row-IDer

Hver rad i en repeterende gruppe får en automatisk generert `altinnRowId` (UUID):

- Stabil identifikator som overlever sortering
- Brukes i diff/patch-operasjoner
- Sendes til backend og persisteres

---

## 8. Tekstressurser og i18n

### 8.1 Tekstressurs-fil (`resource.{lang}.json`)

```json
{
  "language": "nb",
  "resources": [
    { "id": "app.title", "value": "Min tjeneste" },
    {
      "id": "greeting",
      "value": "Hei {0}, du er {1} år gammel",
      "variables": [
        { "key": "person.name", "dataSource": "dataModel.default" },
        { "key": "person.age", "dataSource": "dataModel.default" }
      ]
    },
    {
      "id": "instance.info",
      "value": "Instans-ID: {0}",
      "variables": [{ "key": "instanceId", "dataSource": "instanceContext" }]
    }
  ]
}
```

### 8.2 Datakilder for variabler

| Datakilde              | Format                 | Beskrivelse              |
| ---------------------- | ---------------------- | ------------------------ |
| `dataModel.{type}`     | `dataModel.default`    | Verdi fra datamodell     |
| `instanceContext`      | `instanceContext`      | Instansmetadata          |
| `applicationSettings`  | `applicationSettings`  | App-innstillinger        |
| `customTextParameters` | `customTextParameters` | Fra valideringsmeldinger |

### 8.3 Tekstressursbindinger per komponent

Hver komponenttype har spesifikke bindingsnøkler:

**Felles (TRBLabel):** `title`, `description`, `help`
**Skjema (TRBFormComp):** `tableTitle`, `shortName`, `requiredValidation`
**Oppsummering (TRBSummarizable):** `summaryTitle`, `summaryAccessibleTitle`

Alle tekstbindinger støtter uttrykk.

---

## 9. API-endepunkter

### 9.1 Base-URL

Alle endepunkter bygges fra: `{origin}/{org}/{app}` (kalt `appPath`).

### 9.2 Autentisering

| Endepunkt                                                   | Metode | Beskrivelse     |
| ----------------------------------------------------------- | ------ | --------------- |
| `/api/v1/profile/user`                                      | GET    | Bruker profil   |
| `/api/v1/parties?allowedtoinstantiatefilter=true`           | GET    | Tillatte parter |
| `/api/authorization/parties/current?returnPartyObject=true` | GET    | Valgt parti     |
| `/api/v1/parties/{partyId}`                                 | PUT    | Bytt parti      |
| `/api/authentication/keepAlive`                             | GET    | Oppfrisk JWT    |
| `/api/authentication/invalidatecookie`                      | POST   | Logg ut         |

### 9.3 App-konfigurasjon

| Endepunkt                              | Metode | Respons                       |
| -------------------------------------- | ------ | ----------------------------- |
| `/api/v1/applicationmetadata`          | GET    | `IncomingApplicationMetadata` |
| `/api/v1/applicationsettings`          | GET    | `IApplicationSettings`        |
| `/api/v1/applicationlanguages`         | GET    | `IAppLanguage[]`              |
| `/api/v1/texts/{language}`             | GET    | `ITextResourceResult`         |
| `/api/jsonschema/{dataType}`           | GET    | `JSONSchema7`                 |
| `/api/validationconfig/{dataType}`     | GET    | `IExpressionValidationConfig` |
| `/api/layoutsets`                      | GET    | `ILayoutSets`                 |
| `/api/layoutsettings/{layoutSetId}`    | GET    | `ILayoutSettings`             |
| `/api/layouts/{layoutSetId}`           | GET    | `ILayoutCollection`           |
| `/api/v1/footer`                       | GET    | `IFooterLayout`               |
| `/api/ruleconfiguration/{layoutSetId}` | GET    | `IFormDynamics`               |

### 9.4 Instanshåndtering

| Endepunkt                                                   | Metode | Beskrivelse                |
| ----------------------------------------------------------- | ------ | -------------------------- |
| `/instances?instanceOwnerPartyId={partyId}&language={lang}` | POST   | Opprett instans            |
| `/instances/create?language={lang}`                         | POST   | Opprett med prefill        |
| `/instances/{partyId}/{instanceGuid}`                       | GET    | Hent instans               |
| `/instances/{partyId}/active`                               | GET    | Aktive instanser           |
| `/instances/{instanceId}/layouts/{layoutSetId}`             | GET    | Instans-spesifikke layouts |

### 9.5 Skjemadata

| Endepunkt                                              | Metode   | Modus     | Beskrivelse             |
| ------------------------------------------------------ | -------- | --------- | ----------------------- |
| `/instances/{id}/data/{elementId}?includeRowId=true`   | GET      | Stateful  | Hent skjemadata         |
| `/instances/{id}/data/{elementId}`                     | PATCH    | Stateful  | Oppdater (single-patch) |
| `/instances/{id}/data`                                 | PATCH    | Stateful  | Oppdater (multi-patch)  |
| `/instances/{id}/data?dataType={type}`                 | POST     | Stateful  | Opprett dataelement     |
| `/instances/{id}/data/{elementId}`                     | DELETE   | Stateful  | Slett dataelement       |
| `/v1/data?dataType={type}&includeRowId=true`           | GET/POST | Stateless | Hent/lagre              |
| `/v1/data/anonymous?dataType={type}&includeRowId=true` | GET/POST | Anonym    | Hent/lagre              |

### 9.6 Validering og prosess

| Endepunkt                                                                   | Metode | Beskrivelse        |
| --------------------------------------------------------------------------- | ------ | ------------------ |
| `/instances/{id}/validate?language={lang}&onlyIncrementalValidators={bool}` | GET    | Backend-validering |
| `/instances/{id}/process`                                                   | GET    | Prosessstatus      |
| `/instances/{id}/process/next?language={lang}`                              | PUT    | Gå til neste steg  |
| `/instances/{partyId}/{guid}/actions?language={lang}`                       | POST   | Utfør handling     |

### 9.7 Filer og vedlegg

| Endepunkt                                                  | Metode | Beskrivelse   |
| ---------------------------------------------------------- | ------ | ------------- |
| `/instances/{id}/data/{dataType}?language={lang}`          | POST   | Last opp fil  |
| `/instances/{id}/data/{guid}/tags?ignoredValidators={...}` | PUT    | Oppdater tags |
| `/instances/{id}/data/{elementId}?language={lang}`         | DELETE | Slett fil     |

### 9.8 Dynamiske data

| Endepunkt                                            | Metode | Beskrivelse        |
| ---------------------------------------------------- | ------ | ------------------ |
| `/api/options/{optionsId}?language={lang}&...params` | GET    | Alternativer       |
| `/instances/{id}/options/{optionsId}?...`            | GET    | Sikre alternativer |
| `/api/datalists/{listId}?page={n}&size={n}&...`      | GET    | Datalister         |
| `/instances/{id}/datalists/{listId}?...`             | GET    | Sikre datalister   |
| `/instances/{id}/api/external/{apiId}`               | GET    | Ekstern API        |

### 9.9 Betaling og PDF

| Endepunkt                                               | Metode | Beskrivelse          |
| ------------------------------------------------------- | ------ | -------------------- |
| `/instances/{id}/payment?language={lang}`               | GET    | Betalingsinformasjon |
| `/instances/{id}/payment/order-details?language={lang}` | GET    | Ordredetaljer        |
| `/instances/{id}/pdf/preview?language={lang}`           | GET    | PDF-forhåndsvisning  |

---

## 10. Skjemadata og lagring

### 10.1 Lagringsflyt

1. **Bruker redigerer** → `currentData` oppdateres umiddelbart
2. **Debouncing** (standard 400ms) → `debouncedCurrentData` oppdateres
3. **Endringsdeteksjon** → Sammenlign `debouncedCurrentData` vs `lastSavedData`
4. **Lag patches** (RFC 6902 JSON Patch for stateful, full kropp for stateless)
5. **Send til backend** → Motta oppdatert data + valideringsfeil
6. **Oppdater cache** → `lastSavedData` settes, query-cache oppdateres

### 10.2 PATCH-request (stateful)

```typescript
// Single-patch
{ patch: JsonPatch[], ignoredValidators: string[] }

// Multi-patch
{
  patches: [
    { dataElementId: "guid1", patch: [...] },
    { dataElementId: "guid2", patch: [...] }
  ],
  ignoredValidators: string[]
}
```

### 10.3 PATCH-respons

```typescript
{
  newDataModels: [{ dataElementId: string, data: object }],
  validationIssues: BackendValidationIssuesWithSource[],
  instance: IInstance
}
```

### 10.4 Backend-endringer

Når backend modifiserer data under lagring (beregninger, validering):

1. Respons inneholder `newDataModel` med backend-endringer
2. Frontend lager patch mellom `savedData` og `newDataModel`
3. Appliserer patch til `currentData` hvis ingen konflikter
4. Komponenter ser oppdaterte verdier umiddelbart

### 10.5 Ugyldig data

Frontend opprettholder separat `invalidCurrentData`-modell:

- Bruker skriver "-" i tallfelt → lagret i `invalidCurrentData`
- Gyldig del lagret i `currentData`
- Ved lagring sendes kun gyldig data til backend

### 10.6 Debounce-årsaker

`timeout`, `blur`, `backendChanges`, `listChanges`, `beforeSave`, `unmount`

### 10.7 Låsemekanisme

Forhindrer lagring under server-operasjoner (knappeklikk, filopplasting). Købasert ved flere låser.

### 10.8 Runaway-deteksjon

Beskyttelse mot uendelige lagringsløkker — overvåker siste 10 lagringer for identiske mønstre.

---

## 11. Validering

### 11.1 Valideringskilder

1. **Skjemaspesifikk** — Fra JSON Schema (type, format, min/max)
2. **Påkrevd-felt** — Fra `required`-egenskap (støtter uttrykk)
3. **Uttrykksvaldiring** — Egendefinerte regler i `validation.json`
4. **Backend-validering** — Fra `/instances/{id}/validate`

### 11.2 Valideringskonfigurasjon (`validation.json`)

```json
{
  "validations": {
    "model.field": [
      {
        "message": "Feltet må ha minst 3 tegn",
        "condition": ["greaterThanEq", ["stringLength", ["value"]], 3],
        "severity": "error",
        "showImmediately": false
      },
      {
        "ref": "common-validation",
        "severity": "warning"
      }
    ]
  },
  "definitions": {
    "common-validation": {
      "message": "Anbefalt format",
      "condition": ["contains", ["value"], "@"]
    }
  }
}
```

### 11.3 Alvorlighetsgrader

| Grad      | Beskrivelse              |
| --------- | ------------------------ |
| `error`   | Blokkerer innsending     |
| `warning` | Advarsel, blokkerer ikke |
| `info`    | Informasjon              |
| `success` | Bekreftelse              |

### 11.4 Backend-validering respons

```typescript
{
  dataElementId?: string,
  message?: string,
  customTextKey?: string,
  field?: string,            // Datamodell-sti
  scope?: string,            // 'Field', 'Component', 'Task', 'Instance'
  severity?: 'Error' | 'Warning' | 'Informational',
  code?: string
}
```

### 11.5 Valideringsutløsere (Triggers)

| Trigger                           | Beskrivelse                      |
| --------------------------------- | -------------------------------- |
| `validation`                      | Generell validering              |
| `calculatePageOrder`              | Beregn sideorden                 |
| `validatePage`                    | Valider gjeldende side           |
| `validateCurrentAndPreviousPages` | Valider nåværende + tidligere    |
| `validateAllPages`                | Valider alle sider               |
| `validateRow`                     | Valider rad i repeterende gruppe |

---

## 12. Filvedlegg

### 12.1 Opplastingsflyt

1. Bruker velger fil → Frontend sjekker filtype og størrelse
2. `POST /instances/{id}/data/{dataType}` med `Content-Type` og `Content-Disposition`
3. Backend returnerer `DataPostResponse` med `dataElementId`
4. Vedlegg vises i UI med filnavn og størrelse
5. Valgfritt: Filskanning (`fileScanResult: 'Pending'`)

### 12.2 Filskanning

Når `enableFileScan: true` på datatypen:

1. Opplastet fil starter med `fileScanResult: 'Pending'`
2. Frontend poller instansdata hvert 5. sekund
3. Statuser: `Pending` → `Clean` | `Infected` | `Failed`
4. Polling stopper ved fullført skanning

### 12.3 Tags

Tags tilordnes vedlegg via `PUT /instances/{id}/data/{guid}/tags`:

```json
{ "tags": ["tax-return", "2024"] }
```

---

## 13. Prosessflyt

### 13.1 Prosessmodell

```typescript
{
  started: ISO8601,
  currentTask: {
    flow: number,
    elementId: string,       // Task-ID (f.eks. "Task_1")
    name: string,
    altinnTaskType: string,  // "data", "confirmation", "signing", "payment"
    validated: boolean
  },
  ended?: ISO8601
}
```

### 13.2 Process Next

`PUT /instances/{id}/process/next` med valgfri action:

```json
{ "action": "sign" }
```

**Mulige handlinger:** `sign`, `confirm`, `reject`, egendefinerte handlinger

**Ved feil (409):** Backend returnerer valideringsfeil som vises til bruker.
**Ved PDF-feil (500):** Viser feilmelding og foreslår å prøve igjen.

### 13.3 Sidebarnavigasjon mellom tasks

Konfigureres i `taskNavigation` i layout-settings:

```json
{
  "taskNavigation": [
    { "taskId": "Task_1", "name": "Utfylling" },
    { "taskId": "Task_2", "name": "Signering" },
    { "type": "receipt", "name": "Kvittering" }
  ]
}
```

---

## 14. Betaling

### 14.1 Betalingsflyt

1. `GET /instances/{id}/payment` → `PaymentResponsePayload` med status
2. `GET /instances/{id}/payment/order-details` → `OrderDetails` med varelinjer

### 14.2 Betalingskomponenter

- `Payment` — Viser betalingsinformasjon
- `PaymentDetails` — Detaljert betalingsoversikt

---

## 15. PDF-generering

### 15.1 To moduser

1. **Auto-generert fra layout** — Alle sider rendres som PDF
2. **Egendefinert PDF-layout** — Via `pdfLayoutName` i layout-settings

### 15.2 PDF-kontroll per komponent

- `pageBreak.breakBefore` / `breakAfter` — Sideskift (uttrykk-støtte)
- `excludeFromPdf` — I layout-settings (per side eller komponent)
- Komponenter implementerer `shouldRenderInAutomaticPDF()`

### 15.3 PDF for flere tasks

```
GET /instances/{id}/pdf/preview?language={lang}&pdfForTask=Task_1&pdfForTask=Task_2
```

---

## 16. Autentisering og autorisasjon

### 16.1 Auth-nivåer

Backend kan kreve høyere autentiseringsnivå. Frontend redirecter til:

```
https://{hostname}/ui/authentication/upgrade?goTo={redirect}&reqAuthLevel={level}
```

### 16.2 Auth-kontekst i uttrykk

`["authContext", "permission"]` sjekker brukerens tillatelser:

- `read`, `write`, `instantiate`, `confirm`, `sign`, `reject`

### 16.3 OIDC-provider

Miljøspesifikk innlogging med valgfri OIDC-provider via `iss`-parameter.

---

## 17. Navigasjon

### 17.1 Sidenavigasjon

- `NavigationButtons` — Forrige/neste med valgfri validering
- `NavigationBar` — Sideoverblick med kompakt modus
- `navigation.next` / `navigation.previous` — Per side i layout-filen

### 17.2 Siderekkefølge

Definert i layout-settings:

```json
{ "pages": { "order": ["page1", "page2", "page3"] } }
```

Eller med grupper for sidebar-navigasjon.

### 17.3 Skjult navigasjon

Sider kan skjules med `hidden`-uttrykk på side-nivå. Skjulte sider hoppes over i navigasjonen.

---

## 18. Options og kodelister

### 18.1 Tre kilder for alternativer

**1. Statiske alternativer:**

```json
{
  "options": [
    { "label": "Ja", "value": "yes" },
    { "label": "Nei", "value": "no", "description": "Avslår", "helpText": "Hjelpetekst" }
  ]
}
```

**2. Server-hentede alternativer:**

```json
{
  "optionsId": "countries",
  "queryParameters": { "region": "europe" },
  "secure": false
}
```

**3. Dynamiske fra datamodell:**

```json
{
  "source": {
    "group": "persons",
    "label": "persons[{0}].name",
    "value": "persons[{0}].id",
    "description": "persons[{0}].role"
  }
}
```

### 18.2 Sikre alternativer

Når `secure: true`, brukes instans-endepunktet: `/instances/{id}/options/{optionsId}`

### 18.3 Datalister

Paginerte lister med sortering:

```json
{
  "dataListId": "employees",
  "pagination": { "alternatives": [10, 25, 50], "default": 10 },
  "sortableColumns": ["name", "date"]
}
```

---

## 19. Footer-konfigurasjon

### 19.1 Footer-layout (`footer.json`)

```json
{
  "footer": [
    { "type": "Text", "title": "Kontakt oss" },
    { "type": "Email", "title": "E-post", "target": "support@example.com" },
    { "type": "Phone", "title": "Telefon", "target": "+47 123 45 678" },
    { "type": "Link", "title": "Nettside", "target": "https://example.com", "icon": "information" }
  ]
}
```

**Komponenttyper:** `Text`, `Email`, `Phone`, `Link`
**Ikoner:** `information`, `email`, `phone`

---

## 20. Grid og responsivt layout

### 20.1 Grid-system

12-kolonne responsivt grid basert på breakpoints:

```json
{
  "grid": {
    "xs": 12,
    "sm": 6,
    "md": 4,
    "lg": 3,
    "labelGrid": { "xs": 12, "sm": 4 },
    "innerGrid": { "xs": 12, "sm": 8 }
  }
}
```

| Breakpoint | Beskrivelse          |
| ---------- | -------------------- |
| `xs`       | Ekstra liten (mobil) |
| `sm`       | Liten                |
| `md`       | Medium (desktop)     |
| `lg`       | Stor                 |
| `xl`       | Ekstra stor          |

**Verdier:** `1`-`12` eller `"auto"`

### 20.2 Tabellkolonner

For repeterende grupper og grid-komponenter:

```json
{
  "width": "60%",
  "alignText": "left",
  "textOverflow": { "lineWrap": true, "maxHeight": 100 }
}
```

---

## 21. Oppsummering (Summary)

### 21.1 Summary-komponent

```json
{
  "id": "summary",
  "type": "Summary",
  "componentRef": "firstName",
  "pageRef": "page1",
  "display": {
    "hideChangeButton": false,
    "hideValidationMessages": true,
    "useComponentGrid": true,
    "hideBottomBorder": false
  }
}
```

### 21.2 Summary2-komponent

Avansert oppsummering med target-konfigurasjon:

```json
{
  "id": "summary2",
  "type": "Summary2",
  "target": {
    "type": "layoutSet",
    "taskId": "Task_1"
  },
  "hideEmptyFields": true,
  "isCompact": false
}
```

**Target-typer:** `page`, `layoutSet`, `component`

---

## 22. Feilhåndtering

### 22.1 HTTP-statuskoder

| Kode | Håndtering                                            |
| ---- | ----------------------------------------------------- |
| 400  | Valideringsfeil — vis feilmelding                     |
| 403  | Ikke autorisert — vis feil, trigger auth-oppgradering |
| 404  | Ikke funnet — error boundary                          |
| 409  | Konflikt (process/next) — vis valideringsfeil         |
| 500  | Serverfeil — logg + vis feilmelding                   |

### 22.2 Retry-strategi

- **Queries:** Ingen retry (standard)
- **Instansdata:** 3 forsøk med eksponentiell backoff (maks 30s)
- **Mutasjoner:** Ingen retry

### 22.3 Query-cache

```javascript
{
  staleTime: 10 * 60 * 1000,        // 10 minutter
  refetchOnWindowFocus: false
}
```

---

## 23. Ytelsesoptimalisering

### 23.1 Prefetching

`FormPrefetcher` forhåndshenter layouts, layout-settings, dynamics og betalingsdata parallelt.

### 23.2 Optimistiske oppdateringer

Instansoppdateringer reflekteres i cache før serverrespons med tilbakestilling ved feil.

### 23.3 Selektiv re-rendering

- `useDebouncedSelector()` — Re-render kun ved endring av spesifikt felt
- `useFreshRows()` — Umiddelbar oppdatering for repeterende grupper
- `useCurrentSelector()` — Sanntidsdata (før debounce)

### 23.4 Referanse-deduplisering

Zustand-store dedupliserer objektreferanser: identiske verdier gjenbruker samme referanse for å forhindre unødvendige re-renders.

---

## Formateringsspesifikasjon (IFormatting)

For Input og Number-komponenter:

```json
{
  "formatting": {
    "currency": "NOK",
    "unit": "kilogram",
    "position": "suffix",
    "align": "right",
    "number": {
      "thousandSeparator": " ",
      "decimalSeparator": ",",
      "decimalScale": 2,
      "fixedDecimalScale": true,
      "allowNegative": false,
      "prefix": "kr ",
      "suffix": ",-"
    }
  }
}
```

**Valuta-koder:** ISO 4217 (NOK, USD, EUR, SEK, DKK, GBP, etc.)
**Enheter:** `celsius`, `kilogram`, `percent`, `gram`, `liter`, etc.

---

## 24. Edge Cases og spesialhåndtering

Denne seksjonen dokumenterer ikke-opplagt oppførsel, grensetilfeller og spesialhåndtering som en reimplementering **må** ta hensyn til.

### 24.1 Uttrykksevaluering (Expressions)

#### Fraksjonssekunder i datoer

ISO 8601-datoer med mer enn 3 desimaler i sekundleddet (f.eks. `31.12.2021 23:59:59.9999999`) trunkeres til 3 desimaler fordi `date-fns.parseISO()` feiler ellers. Dette kan forårsake avrundingseffekter — f.eks. kan datoen rulle over til neste dag/år.

**Fil:** `src/features/expressions/index.ts`

#### Null/undefined gir standardverdi

Når et uttrykk evalueres til `null` eller `undefined`, returneres komponentens `defaultValue` i stedet. En reimplementering må definere standardverdier for alle uttrykkskontekster.

#### Rekursjonsdybde

Uttrykk støtter maks 2 nivåer nesting i typesystemet (hardkodet). Dypere nesting kompilerer, men typesikkerheten brytes.

**Fil:** `src/features/expressions/types.ts`

#### Tall i options castes til strenger

Tall i options-lister castes til strenger av `useGetOptions()`. Sammenligningsuttrykk som `["equals", ["component", "dropdown"], 42]` kan feile fordi verdien egentlig er `"42"`. Sammenligningen gjøres "lax" med vilje.

**Fil:** `src/features/expressions/expression-functions.ts`

### 24.2 Skjemadata og lagring

#### Debounce-vindu og tapte mellomtilstander

Med standard 400ms debounce lagres kun den siste tilstanden. Mellomliggende verdier sendes aldri til backend. En reimplementering må håndtere at kun sluttverdien persisteres.

#### Låsemekanisme overskriver brukerendringer

Når data er låst (f.eks. under CustomButton-prosessering), kan brukeren fortsatt redigere lokalt. Når låsen frigis med ny serverdata, **overskrives brukerendringer** som ble gjort under låsen. Dette er dokumentert oppførsel, ikke en feil.

**Fil:** `src/features/formData/FormData.test.tsx` — test: "Locking should allow changes to the form data, but some values may be overwritten"

#### Skriving til readonly-datatyper feiler stille

Forsøk på å skrive til readonly-datatyper logges som feil, men brukeren får **ingen tilbakemelding**. Operasjonen avbrytes uten feilmelding i UI.

**Fil:** `src/features/formData/FormDataWriteStateMachine.tsx`

#### Stateless-apper mangler atomisk multi-modell-lagring

Stateless-apper bruker separate POST-kall per datamodell. Hvis ett kall lykkes og et annet feiler, blir tilstanden inkonsistent. Det finnes ingen rollback-mekanisme.

**Fil:** `src/features/formData/FormDataWrite.tsx`

#### Ugyldig data lagres separat

Frontend opprettholder en egen `invalidCurrentData`-modell. Når en bruker skriver "-" i et tallfelt, lagres dette i `invalidCurrentData` mens `currentData` beholder den siste gyldige verdien. Kun gyldig data sendes til backend.

#### Runaway-deteksjon

Frontenden overvåker de siste 10 lagringene for identiske mønstre og stopper lagring hvis den oppdager en uendelig løkke (f.eks. backend endrer data → frontend lagrer → backend endrer igjen).

### 24.3 Repeterende grupper

#### Manglende rad-IDer (`ALTINN_ROW_ID`)

Alle rader i repeterende grupper **må** ha en `ALTINN_ROW_ID` (UUID). Uten denne feiler rad-sammenligning i patch-generering. Frontenden logger en advarsel, men rader kan dupliseres eller forsvinne.

**Fil:** `src/features/formData/jsonPatch/createPatch.ts`, `src/features/formData/MissingRowIdException.ts`

#### Paginering og rad-sletting

Hvis en rad slettes på siste side slik at det gjenstår færre rader enn `rowsPerPage`, forsvinner pagineringskomponenten. Sideindeksen kan peke til en ugyldig side.

#### Klient-opprettede rader vs. server-prefill

Når backend er treg og returnerer prefill-data for en rad mens klienten allerede har opprettet en rad, beholdes **begge** rader. Dette kan gi duplikater.

**Fil:** `src/features/formData/jsonPatch/createPatch.test.ts`

#### Sletting under redigering

Hvis en rad slettes mens den er i redigeringsmodus, returnerer container-komponenten `null`. Dette er en eksplisitt håndtering.

**Fil:** `src/layout/RepeatingGroup/Container/RepeatingGroupContainer.tsx`

#### maxCount håndheves ikke i valideringshook

`useValidateRepGroupMinCount` sjekker kun `minCount`. `maxCount`-validering må håndheves andre steder (f.eks. ved å skjule "legg til"-knappen).

### 24.4 Validering

#### Validering på skjulte felter

Uttrykksvaldidinger evalueres **også for skjulte komponenter**. Skjulte felter kan akkumulere valideringsfeil som aldri vises til brukeren.

**Fil:** `src/features/validation/expressionValidation/ExpressionValidation.test.tsx` — test: "component-lookup-hidden.json"

#### Manglende data i valideringsuttrykk

Hvis et valideringsuttrykk refererer til et felt som ikke finnes, returnerer `evalExpr()` standardverdien `false`. Manglende data gjør at valideringen **passerer stille**.

#### Backend-validering ved prosess/neste (409)

Når `PUT /instances/{id}/process/next` returnerer 409 med `validationIssues`, behandles disse som valideringsfeil og blokkerer innsending. Brukeren kan forsøke igjen ubegrenset.

#### Subform-validering krever refetch

Hvis en side inneholder en Subform, hentes backend-validering **på nytt** før sjekk av sidefeil. Mellom fetch og sjekk kan subform-data endres, og stale valideringer brukes.

**Fil:** `src/features/validation/callbacks/onPageNavigationValidation.ts`

### 24.5 Navigasjon

#### Skjulte sider filtreres dynamisk

`usePageOrder()` filtrerer ut skjulte sider fra rå siderekkefølge. Hvis sidesynlighet endres dynamisk (via uttrykk), endres navigasjonsrekkefølgen. En bruker kan stå på en side som plutselig blir skjult.

**Fil:** `src/hooks/useNavigatePage.ts`

#### Navigasjon forbi siste/første side

Forsøk på å navigere forbi siste eller før første side logger en advarsel, men gir **ingen feil til brukeren**. Navigasjon skjer simpelthen ikke.

#### URL-dekoding av side-IDer

Side-IDer sammenlignes med `decodeURIComponent()`. Hvis det er mismatch i encoding, kan en side feilaktig markeres som ugyldig.

#### Subform-navigasjon med ugyldig komponent

`enterSubform()` validerer at målsiden eksisterer. Hvis den er `undefined`, logges en advarsel, men brukeren får ingen tilbakemelding.

### 24.6 Filopplasting

#### Samtidige opplastinger

Det er ingen eksplisitt samtidighetskontroll. Flere filer kan lastes opp parallelt. Hvis maks filstørrelse overskrides eller virusskanning feiler under samtidige opplastinger, kan tilstanden bli inkonsistent.

#### Opplasting under lagringslås

Vedlegg lastes opp uavhengig av lagringslåsen. Vedlegg kan lastes opp mens skjemadata er låst, og kan potensielt skape foreldreløse vedlegg hvis låsen frigis uten lagring.

#### Tag-tildeling er separat

Tags oppdateres via en separat PUT-request. Hvis tag-tildelingen feiler med validering, forblir filen opplastet men uten tag.

#### Filskanning og prosess/neste

Koden sjekker `hasPendingScans` før innsending. Hvis skanningen fullføres mellom sjekken og innsendingen, brukes gamle data. Instansdata hentes på nytt for å motvirke dette.

**Fil:** `src/features/instance/useProcessNext.tsx`

### 24.7 Modusspesifikke begrensninger

| Funksjon              | Stateful | Stateless                | Anonym |
| --------------------- | -------- | ------------------------ | ------ |
| Multi-patch (atomisk) | Ja       | Nei (separate POST)      | Nei    |
| Filopplasting         | Ja       | Nei                      | Nei    |
| Sikre options         | Ja       | Nei (mangler instans-ID) | Nei    |
| Låsemekanisme         | Ja       | Nei                      | Nei    |
| Subforms              | Ja       | Nei                      | Nei    |
| Filskanning           | Ja       | Nei                      | Nei    |
| Prosesstrinn          | Ja       | Nei                      | Nei    |

Forsøk på å bruke stateful-funksjonalitet i stateless-modus feiler typisk stille — operasjonen logges som feil men brukeren informeres ikke.

### 24.8 Prosess/neste (Process/Next)

#### PDF-generering feiler (500)

Hvis PDF-generering feiler under prosess/neste og appen støtter unlocking, vises en feilmelding og dataelementer låses opp. Skjemaet er i en tilstand der prosess/neste feilet men data er tilgjengelig for redigering.

#### Task-endring uten lagring

Hvis `appSupportsUnlockingOnProcessNextFailure` er true og prosessen feiler, hentes prosesstilstand på nytt. Hvis tasken har endret seg, navigeres brukeren **uten å lagre ulagrede data**.

**Fil:** `src/features/instance/useProcessNext.tsx`

#### Samtidige prosess/neste-kall

`useMutation()` med `scope: { id: 'process/next' }` sikrer at samtidige kall håndteres sekvensielt. Første mutasjon som lykkes trigger navigasjon.

### 24.9 Options og kodelister

#### preselectedOptionIndex utenfor rekkevidde

Hvis `preselectedOptionIndex` overstiger options-arrayens lengde, returnerer `options[index]` `undefined`. Ingen feilsjekk utføres — komponentene feiler stille.

**Fil:** `src/features/options/effects/EffectPreselectedOptionIndex.tsx`

#### Avhengige options fjerner valgt verdi

Når options endres pga. datamodelavhengigheter (`queryParameters`), fjernes brukerens tidligere valg hvis verdien ikke finnes i nye options. Dette er tilsiktet oppførsel.

**Fil:** `src/features/options/effects/EffectRemoveStaleValues.tsx`

#### Null-verdier i options castes til streng

`null`-verdier castes til stringen `"null"` og `undefined` til tom streng `""`. En option med `null`-verdi blir valgbar som stringen `"null"`.

**Fil:** `src/features/options/castOptionsToStrings.ts`

### 24.10 PDF-generering

#### Komponenter rendres annerledes

PDF-generering bruker et eget presentasjonslag (`DummyPresentation`). Komponenter som avhenger av nettleserspesifikk oppførsel eller CSS rendres potensielt feil.

#### Uttrykk i PDF-kontekst

Uttrykk evalueres med task-IDer fra URL-søkeparametere under PDF-generering. Hvis uttrykk avhenger av URL-tilstand som endres mellom skjemavisning og PDF-generering, oppstår inkonsistens.

#### Skjulte komponenter i PDF

Skjulte komponenter rendres ikke i PDF, men valideringsfeil for skjulte felter kan fortsatt vises i valideringssammendraget.

### 24.11 Subforms

#### Kun ett nesting-nivå

Kun enkelt-nivå subforms støttes. Navigasjonsparametere (`mainPageKey`, `componentId`, `dataElementId`) håndterer ikke dypere nesting.

#### Subform kan ikke ha task-tilknytning

Subform-layout kan ikke ha både type "subform" og en task-tilknytning. Dette kaster `InvalidSubformLayoutException`.

**Fil:** `src/features/formData/InvalidSubformLayoutException.ts`

#### Endring av overordnet layout under subform-visning

Hvis overordnet layout endres (via `hidden`-uttrykk) mens bruker er i en subform, returnerer exit-navigasjonen til den **gamle** side-layouten.

---

## 25. Motstridende konfigurasjon

Denne seksjonen dokumenterer hva som skjer når konfigurasjonsalternativer kolliderer eller er gjensidig utelukkende.

### 25.1 Options-kilder: `source` vs `optionsId` vs `options`

**Konflikt:** Tre gjensidig utelukkende måter å definere alternativer, men alle kan settes samtidig.

**Oppførsel:** Frontenden sjekker i rekkefølge: `source` → `optionsId` → `options`. Første ikke-tomme kilde vinner; øvrige ignoreres **uten advarsel**.

```json
{
  "type": "Dropdown",
  "source": { "group": "persons", "label": "...", "value": "..." },
  "optionsId": "countries",
  "options": [{ "label": "Ja", "value": "yes" }]
}
```

**Resultat:** `source` brukes, `optionsId` og `options` ignoreres stille.

**Fil:** `src/features/options/useGetOptions.ts`

### 25.2 `pages.order` vs `pages.groups`

**Konflikt:** Begge definerer siderekkefølge i layout-settings, men de er gjensidig utelukkende.

**Oppførsel:** Frontenden **kaster feil** og forhindrer lasting hvis begge er satt:

> "Specify one of `pages.order` or `pages.groups` in Settings.json"

Samme feil kastes hvis **ingen** av dem er satt.

**Fil:** `src/features/form/layoutSettings/LayoutSettingsContext.tsx`

### 25.3 `hidden` + `required`

**Konflikt:** En komponent er påkrevd men samtidig skjult.

**Oppførsel:** Skjulte komponenters validering evalueres fortsatt. En skjult påkrevd komponent kan blokkere innsending med en feilmelding brukeren ikke kan se. En reimplementering bør vurdere å automatisk fjerne `required`-validering for skjulte felter.

### 25.4 `readOnly` + `required`

**Konflikt:** En komponent er skrivebeskyttet men samtidig påkrevd.

**Oppførsel:** Brukeren kan ikke endre verdien, men valideringen krever en verdi. Hvis feltet er tomt og readOnly, kan brukeren **aldri** tilfredsstille valideringen. Valgfri-indikatoren (`optionalIndicator`) vises basert på `required`, uavhengig av `readOnly`.

**Fil:** `src/utils/layout/useLabel.tsx`

### 25.5 `minCount` > `maxCount` i repeterende grupper

**Konflikt:** `minCount` satt høyere enn `maxCount`.

**Oppførsel:** Ingen kryssvalidering utføres. Brukeren kan ikke legge til nok rader (blokkert av `maxCount`) men får valideringsfeil for å ha for få rader (krevd av `minCount`). **Ingen advarsel** vises til utvikler.

**Fil:** `src/layout/RepeatingGroup/useValidateRepGroupMinCount.ts`, `src/layout/Subform/useValidateSubform.ts`

### 25.6 `minNumberOfAttachments` > `maxNumberOfAttachments`

**Konflikt:** Minimum overstiger maksimum for filopplasting.

**Oppførsel:** Ingen validering. Brukeren kan aldri tilfredsstille kravet — alltid for få eller for mange filer. **Ingen advarsel** til utvikler.

### 25.7 `edit.mode: "onlyTable"` med redigeringsegenskaper

**Konflikt:** `onlyTable`-modus viser kun tabell uten redigeringsmulighet, men `showInExpandedEdit`, `editButton`, `saveButton` kan settes.

**Oppførsel:** Redigeringsegenskapene ignoreres stille i `onlyTable`-modus. Ingen advarsel.

### 25.8 `pagination` med `edit.mode: "showAll"`

**Konflikt:** Paginering gir mening kun når rader vises i tabell, men `showAll` viser alle rader i redigeringsmodus.

**Oppførsel:** Paginering ignoreres stille. Ingen advarsel.

### 25.9 `optionFilter` fjerner valgt verdi

**Konflikt:** Et `optionFilter`-uttrykk ekskluderer en verdi som brukeren allerede har valgt.

**Oppførsel:** Verdien fjernes fra valget. Frontenden logger en advarsel:

> `Node 'id': Option with value "x" was selected, but the option filter excludes it. This will cause the option to be deselected.`

**Fil:** `src/features/options/useGetOptions.ts`

### 25.10 `Summary` peker til ikke-eksisterende komponent

**Konflikt:** `componentRef` refererer til en komponent-ID som ikke finnes i layouten.

**Oppførsel:** Feil logges med `logErrorOnce()`:

> "Målet for oppsummeringen ({componentRef}) ble ikke funnet"

Valideringsfeil legges til noden. Komponenten rendres ikke.

**Fil:** `src/layout/Summary/ValidateSummary.tsx`

### 25.11 `Summary` peker til annen `Summary`

**Konflikt:** En Summary-komponent refererer til en annen Summary-komponent, potensielt i en sirkulær kjede.

**Oppførsel:** Validering for dette er **deaktivert** (utkommentert kode). Sirkulære referanser er mulige og kan forårsake uendelig løkke.

**Fil:** `src/layout/Summary/ValidateSummary.tsx` — TODO-kommentar indikerer at dette må undersøkes.

### 25.12 Conditional rendering rules i innebygde skjemaer

**Konflikt:** Betinget rendering-regler (dynamics) brukt i Subform eller Summary2 med `taskId`.

**Oppførsel:** Ikke støttet. Feil logges:

> "Conditional rendering rules are not supported in embedded forms..."

**Fil:** `src/features/form/dynamics/HiddenComponentsProvider.tsx`

### 25.13 Sirkulære uttrykkavhengigheter

**Konflikt:** Uttrykk refererer til hverandre i en sirkel (f.eks. komponent A er skjult basert på komponent B, som er skjult basert på komponent A).

**Oppførsel:** Ingen validering utføres. Koden kommenterer:

> "You _could_ run into an infinite loop if you have a circular dependency in your expressions, but that's a problem with your form, not this code."

React-reaktivitet håndterer re-evaluering, men resultatet er udefinert.

**Fil:** `src/features/form/dynamics/HiddenComponentsProvider.tsx`

### 25.14 Flere komponenter bundet til samme felt

**Konflikt:** To eller flere komponenter har `dataModelBindings.simpleBinding` til samme datamodell-sti.

**Oppførsel:** Tillatt uten advarsel. Begge kan vise og redigere verdien. "Siste skriver vinner" — verdien synkroniseres via datamodeellen, men rekkefølgen av oppdateringer er avhengig av debounce-timing.

### 25.15 `ImageUpload` uten bildeformat i `allowedContentTypes`

**Konflikt:** `allowedContentTypes` konfigurert men mangler påkrevd bildetype (f.eks. `image/png`).

**Oppførsel:** Advarsel logges med `logErrorOnce()`:

> `allowedContentTypes is configured for '{id}', but is missing '{IMAGE_TYPE}'...`

Opplasting fortsetter, men kan feile ved validering.

**Fil:** `src/layout/ImageUpload/ImageUploadComponent.tsx`

### 25.16 Duplikate option-verdier

**Konflikt:** Options-array inneholder flere oppføringer med samme `value`.

**Oppførsel:** Duplikatet detekteres og fjernes. Advarsel logges med `logWarnOnce()`.

**Fil:** `src/features/options/useGetOptions.ts`

### 25.17 Oversikt over konfliktoppførsel

| Konflikt                            | Resultat                    | Advarsel?  |
| ----------------------------------- | --------------------------- | ---------- |
| `source` + `optionsId` + `options`  | Første vinner               | Nei        |
| `pages.order` + `pages.groups`      | Kaster feil                 | Ja (fatal) |
| `hidden` + `required`               | Skjult validering blokkerer | Nei        |
| `readOnly` + `required`             | Uoppfyllelig krav           | Nei        |
| `minCount` > `maxCount`             | Uoppfyllelig krav           | Nei        |
| `minAttachments` > `maxAttachments` | Uoppfyllelig krav           | Nei        |
| `onlyTable` + redigeringsegenskaper | Ignorert stille             | Nei        |
| `pagination` + `showAll`            | Ignorert stille             | Nei        |
| `optionFilter` fjerner valg         | Verdi fjernes               | Ja         |
| `Summary` → ukjent komponent        | Feil logges                 | Ja         |
| `Summary` → `Summary`               | Tillatt (mulig loop)        | Nei        |
| Dynamics i embedded form            | Feil logges                 | Ja         |
| Sirkulære uttrykk                   | Udefinert oppførsel         | Nei        |
| Flere komponenter → samme felt      | Siste skriver vinner        | Nei        |
| Duplikate option-verdier            | Dedupliseres                | Ja         |

---

_Sist oppdatert: 2026-02-09_
_Generert fra JSON-skjemaer og kildekode i app-frontend-react._
