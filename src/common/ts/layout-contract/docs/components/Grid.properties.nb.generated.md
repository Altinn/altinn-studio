Komponenten støtter også de [felles komponentegenskapene](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;Grid&quot;">Type: <span class="component-property-value">&quot;Grid&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilken komponenttype konfigurasjonen gjelder.</div></div>
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

<details class="card adocs-expand adocs-expand-small component-property" id="labelsettings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="labelSettings">labelSettings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Styrer hvordan ledeteksten til komponenten vises.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="labelsettings.optionalindicator">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="labelSettings.optionalIndicator">labelSettings.optionalIndicator</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Viser en markering for valgfrie felt ved ledeteksten.</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Ledeteksten eller tittelen som vises over komponenten.</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Beskrivelsen som vises mellom ledeteksten og komponenten.</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hjelpeteksten som vises når brukeren åpner hjelpeknappen.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="component-property-group" id="rows">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rows">rows</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over radene i rutenettet.</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].header">rows[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].readOnly">rows[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions">rows[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.width">rows[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.alignText">rows[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].columnOptions.textOverflow">rows[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.textOverflow.lineWrap">rows[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.textOverflow.maxHeight">rows[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.hidden">rows[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells">rows[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over cellene i raden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].component">rows[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Komponentens ID.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].text">rows[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten som skal vises. Kan også være en nøkkel til en tekstressurs.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].help">rows[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hjelpeteksten som skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].labelFrom">rows[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angi ID-en til en annen komponent for å vise ledeteksten fra den komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>
    </div>

  </div>
</details>
