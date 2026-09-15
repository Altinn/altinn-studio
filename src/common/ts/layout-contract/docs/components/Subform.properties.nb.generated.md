Komponenten støtter også de [felles komponentegenskapene](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;Subform&quot;">Type: <span class="component-property-value">&quot;Subform&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilken komponenttype konfigurasjonen gjelder.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="readonly">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="readOnly">readOnly</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Boolsk verdi eller uttrykk som angir om komponenten skal være skrivebeskyttet eller deaktivert. Selv skrivebeskyttede felt kan foreløpig endres ved å manipulere API-kallet.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="required">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="required">required</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Boolsk verdi eller uttrykk som angir om komponenten skal være påkrevd.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="showvalidations">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="showValidations">showValidations</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over valideringstypene som skal vises.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="renderassummary">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="renderAsSummary">renderAsSummary</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om komponenten skal vises som en oppsummering.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="forceshowinsummary">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="forceShowInSummary">forceShowInSummary</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Tvinger komponenten til å vises i en oppsummering selv om hideEmptyFields er true i oppsummeringskomponenten.</div></div>
</details>

<details class="component-property-group" id="textresourcebindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings">textResourceBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Kobler tekstene i komponenten til tekstressurser eller uttrykk.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.tabletitle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.tableTitle">textResourceBindings.tableTitle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Tittelen som vises i tabellvisningen. Overstyrer den vanlige tittelen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.shortname">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.shortName">textResourceBindings.shortName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Alternativt navn i valideringsmeldinger for påkrevde felt. Overstyrer den vanlige tittelen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.requiredvalidation">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.requiredValidation">textResourceBindings.requiredValidation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hele valideringsmeldingen som vises når komponenten er påkrevd og mangler verdi. Overstyrer både standardmeldingen og kortnavnet.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.summarytitle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.summaryTitle">textResourceBindings.summaryTitle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Tittelen som vises i oppsummeringen. Overstyrer den vanlige tittelen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.summaryaccessibletitle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.summaryAccessibleTitle">textResourceBindings.summaryAccessibleTitle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Tittelen som brukes i aria-label på redigeringsknappen i oppsummeringen. Overstyrer både den vanlige tittelen og oppsummeringstittelen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.title">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.title">textResourceBindings.title</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Ledeteksten til underskjemakomponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.description">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.description">textResourceBindings.description</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Beskrivelsen som vises under ledeteksten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.help">textResourceBindings.help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hjelpetekst som vises når brukeren klikker på hjelpeknappen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.addbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.addButton">textResourceBindings.addButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten som legges til etter standardteksten på «Legg til»-knappen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.tableeditbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.tableEditButton">textResourceBindings.tableEditButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Rediger»-knappen i tabellradene.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="layoutset">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="layoutSet">layoutSet</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Layout-settet som skal lastes inn i underskjemaet.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="showaddbutton">
  <div class="component-property-summary">
    <span class="component-property-name" title="showAddButton">showAddButton</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </div>
</div>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="showdeletebutton">
  <div class="component-property-summary">
    <span class="component-property-name" title="showDeleteButton">showDeleteButton</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </div>
</div>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="entrydisplayname">
  <div class="component-property-summary">
    <span class="component-property-name" title="entryDisplayName">entryDisplayName</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </div>
</div>

<details class="component-property-group" id="tablecolumns">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="tableColumns">tableColumns</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="tablecolumns[].headercontent">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tableColumns[].headerContent">tableColumns[].headerContent</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Kolonneoverskriften som skal vises. Kan inneholde en tekstressursbinding, men ikke oppslag i datamodellen.</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="tablecolumns[].cellcontent">
        <div class="component-property-summary">
          <span class="component-property-name" title="tableColumns[].cellContent">tableColumns[].cellContent</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="object | object">Type: <span class="component-property-value">object | object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="tablecolumns[].cellcontent.value">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tableColumns[].cellContent.value">tableColumns[].cellContent.value</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Celleverdien som skal vises fra et uttrykk eller en statisk verdi.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="tablecolumns[].cellcontent.default">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tableColumns[].cellContent.default">tableColumns[].cellContent.default</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Standardverdien som vises hvis query eller value ikke gir et resultat.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="tablecolumns[].cellcontent.query">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tableColumns[].cellContent.query">tableColumns[].cellContent.query</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Celleverdien som skal vises fra et oppslag i datamodellen, angitt med punktnotasjon.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="tablecolumns[].cellcontent.default">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tableColumns[].cellContent.default">tableColumns[].cellContent.default</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Standardverdien som vises hvis query eller value ikke gir et resultat.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="summarydelimiter">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="summaryDelimiter">summaryDelimiter</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot; — &quot;</span></span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Verdien som skiller celler eller elementer når oppsummeringen ikke kan bruke rik layout, vanligvis komma, bindestrek eller lignende.</div></div>
</details>
