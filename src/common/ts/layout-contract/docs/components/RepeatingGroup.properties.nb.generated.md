Komponenten støtter også de [felles komponentegenskapene](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;RepeatingGroup&quot;">Type: <span class="component-property-value">&quot;RepeatingGroup&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilken komponenttype konfigurasjonen gjelder.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="showvalidations">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="showValidations">showValidations</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Ledeteksten til gruppen, vist over hver forekomst i en oppsummering.</div></div>
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

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.addbuttonfull">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.addButtonFull">textResourceBindings.addButtonFull</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Legg til»-knappen. Overstyrer «addButton» og angir hele knappeteksten.</div></div>
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

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.savebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.saveButton">textResourceBindings.saveButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Lagre»-knappen når raden i den repeterende gruppen redigeres.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.saveandnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.saveAndNextButton">textResourceBindings.saveAndNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Lagre og neste»-knappen når raden redigeres. Vises bare når edit.saveAndNextButton er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.editbuttonclose">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.editButtonClose">textResourceBindings.editButtonClose</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Rediger»-knappen når raden redigeres og brukeren kan lukke redigeringsvisningen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.editbuttonopen">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.editButtonOpen">textResourceBindings.editButtonOpen</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Rediger»-knappen når raden i den repeterende gruppen ikke redigeres.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.paginationnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.paginationNextButton">textResourceBindings.paginationNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Neste»-knappen i paginering.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.paginationbackbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.paginationBackButton">textResourceBindings.paginationBackButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Tilbake»-knappen i paginering.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.multipagebackbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.multipageBackButton">textResourceBindings.multipageBackButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Tilbake»-knappen i flersidenavigasjon.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.multipagenextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.multipageNextButton">textResourceBindings.multipageNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på «Neste»-knappen i flersidenavigasjon.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="component-property-group" id="rowsbefore">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rowsBefore">rowsBefore</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over radene i rutenettet.</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].header">rowsBefore[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].readOnly">rowsBefore[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions">rowsBefore[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.width">rowsBefore[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.alignText">rowsBefore[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow">rowsBefore[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow.lineWrap">rowsBefore[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow.maxHeight">rowsBefore[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.hidden">rowsBefore[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells">rowsBefore[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over cellene i raden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].component">rowsBefore[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Komponentens ID.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].text">rowsBefore[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten som skal vises. Kan også være en nøkkel til en tekstressurs.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].help">rowsBefore[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hjelpeteksten som skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].labelFrom">rowsBefore[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angi ID-en til en annen komponent for å vise ledeteksten fra den komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="component-property-group" id="rowsafter">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rowsAfter">rowsAfter</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over radene i rutenettet.</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].header">rowsAfter[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].readOnly">rowsAfter[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions">rowsAfter[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.width">rowsAfter[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.alignText">rowsAfter[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow">rowsAfter[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow.lineWrap">rowsAfter[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow.maxHeight">rowsAfter[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.hidden">rowsAfter[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells">rowsAfter[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Listen over cellene i raden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].component">rowsAfter[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Komponentens ID.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].text">rowsAfter[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten som skal vises. Kan også være en nøkkel til en tekstressurs.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].help">rowsAfter[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hjelpeteksten som skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].labelFrom">rowsAfter[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angi ID-en til en annen komponent for å vise ledeteksten fra den komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for raden eller kolonnen.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Bredden på cellen i prosent eller «auto». Standardverdien er «auto».</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Slår tekstbryting av eller på. Standardverdien er true.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Flere egenskaper for kolonner i Grid-komponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Antall kolonner cellen skal spenne over. Standardverdien er 1.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="removewhenhidden">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="removeWhenHidden">removeWhenHidden</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Overstyrer oppryddingen av data for skjulte komponenter ved slutten av oppgaven.</div></div>
</details>

<details class="component-property-group" id="datamodelbindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="dataModelBindings">dataModelBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Kobler verdiene i komponenten til felter i datamodellen.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.group">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.group">dataModelBindings.group</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Påkrevd</span>
            <span class="component-property-type" title="datamodellbinding">Type: <span class="component-property-value"><a href="/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">datamodellbinding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Plassering i punktnotasjon for den repeterende gruppestrukturen, en liste med objekter, der dataene lagres. <a href="/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">Slik bruker du datamodellbindinger.</a></div></div>
      </details>
    </div>
  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonsaverow">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnSaveRow">validateOnSaveRow</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over valideringstypene som skal vises.</div></div>
</details>

<details class="component-property-group" id="edit">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="edit">edit</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="edit.mode">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.mode">edit.mode</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;showTable&quot;</span></span>
            <span class="component-property-type" title="&quot;hideTable&quot; | &quot;showTable&quot; | &quot;showAll&quot; | &quot;onlyTable&quot;">Type: <span class="component-property-value">&quot;hideTable&quot; | &quot;showTable&quot; | &quot;showAll&quot; | &quot;onlyTable&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Modusen til den repeterende gruppen. Tillatte verdier: "hideTable", "showTable", "showAll", "onlyTable".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.addbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.addButton">edit.addButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om «Legg til»-knappen skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.savebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.saveButton">edit.saveButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om «Lagre»-knappen skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.deletebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.deleteButton">edit.deleteButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om «Slett»-knappen skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.editbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.editButton">edit.editButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om «Rediger»-knappen skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.multipage">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.multiPage">edit.multiPage</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Gjør det mulig å redigere en repeterende gruppe over flere interne sider. Hver komponent i "children" må ha et prefiks med sidenummeret den skal vises på, for eksempel "1:component1" eller "2:component2".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.openbydefault">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.openByDefault">edit.openByDefault</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | &quot;first&quot; | &quot;last&quot;">Type: <span class="component-property-value">boolean | &quot;first&quot; | &quot;last&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Hvis satt til true, åpnes en rad som standard når gruppen er tom. Hvis satt til "first" eller "last", åpnes henholdsvis den første eller siste raden som standard.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.alertondelete">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.alertOnDelete">edit.alertOnDelete</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om brukeren skal bekrefte sletting.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.saveandnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.saveAndNextButton">edit.saveAndNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om «Lagre og neste»-knappen skal vises.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.alwaysshowaddbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.alwaysShowAddButton">edit.alwaysShowAddButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Viser alltid «Legg til»-knappen, også under redigering.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.compactbuttons">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.compactButtons">edit.compactButtons</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Viser bare ikoner på redigerings- og sletteknappene når raden ikke redigeres.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.buttonlayout">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.buttonLayout">edit.buttonLayout</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;horizontal&quot;</span></span>
            <span class="component-property-type" title="&quot;horizontal&quot; | &quot;vertical&quot;">Type: <span class="component-property-value">&quot;horizontal&quot; | &quot;vertical&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir plasseringen av redigerings- og sletteknappene i tabellvisning på store skjermer. Tillatte verdier: "horizontal", "vertical".</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="pagination">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="pagination">pagination</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Innstillinger for paginering av radene i den repeterende gruppen.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="pagination.rowsperpage">
  <div class="component-property-summary">
    <span class="component-property-name" title="pagination.rowsPerPage">pagination.rowsPerPage</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="integer (1–∞)">Type: <span class="component-property-value">integer (1–∞)</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="maxcount">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="maxCount">maxCount</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="integer (1–∞)">Type: <span class="component-property-value">integer (1–∞)</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Maksimalt antall rader brukeren kan legge til.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="mincount">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="minCount">minCount</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">0</span></span>
      <span class="component-property-type" title="integer (0–∞)">Type: <span class="component-property-value">integer (0–∞)</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Minste antall rader brukeren må legge til. Gruppen viser en valideringsfeil hvis den har for få rader.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="tableheaders">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="tableHeaders">tableHeaders</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over komponent-ID-er som skal vises som tabelloverskrifter.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="tablecolumns">
  <div class="component-property-summary">
    <span class="component-property-name" title="tableColumns">tableColumns</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="hiddenrow">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="hiddenRow">hiddenRow</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Uttrykk eller boolsk verdi som angir om hver rad skal skjules.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="stickyheader">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="stickyHeader">stickyHeader</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Fester overskriften til den repeterende gruppen mens brukeren ruller.</div></div>
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

<details class="component-property-group" id="addbutton">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="addButton">addButton</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.size">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.size">addButton.size</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;md&quot;</span></span>
            <span class="component-property-type" title="&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot;">Type: <span class="component-property-value">&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Knappens størrelse. Har bare effekt når stilen er primary eller secondary. Tillatte verdier: "sm", "md", "lg".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.textalign">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.textAlign">addButton.textAlign</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">&quot;center&quot;</span></span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Justerer teksten når stilen er primary eller secondary. Tillatte verdier: "left", "center", "right".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.fullwidth">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.fullWidth">addButton.fullWidth</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om en lenkeknapp skal fylle hele bredden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.position">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.position">addButton.position</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Plasserer knappen til venstre, i midten eller til høyre på skjermen. Tillatte verdier: "left", "center", "right".</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="children">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="children">children</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over ID-ene til underkomponentene som skal vises. Komponentene gjentas for hver rad i datamodellbindingen.</div></div>
</details>
