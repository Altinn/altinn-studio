Komponenten støtter også de [felles komponentegenskapene](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;NavigationButtons&quot;">Type: <span class="component-property-value">&quot;NavigationButtons&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilken komponenttype konfigurasjonen gjelder.</div></div>
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
      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.back">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.back">textResourceBindings.back</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på knappen for å gå tilbake til forrige side.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.next">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.next">textResourceBindings.next</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på knappen for å gå til neste side.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.backtopage">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.backToPage">textResourceBindings.backToPage</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Teksten på knappen «Tilbake til side» når uttrykket linkToPage eller linkToComponent brukes.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="showbackbutton">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="showBackButton">showBackButton</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">true</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Viser både tilbake- og neste-knapp i stedet for bare neste-knappen.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="validateonnext">
  <div class="component-property-summary">
    <span class="component-property-name" title="validateOnNext">validateOnNext</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonnext.page">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnNext.page">validateOnNext.page</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilke sider som skal valideres når brukeren velger neste-knappen. Tillatte verdier: "current", "currentAndPrevious", "all".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonnext.show">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnNext.show">validateOnNext.show</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over valideringstypene som skal vises.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="validateonprevious">
  <div class="component-property-summary">
    <span class="component-property-name" title="validateOnPrevious">validateOnPrevious</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonprevious.page">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnPrevious.page">validateOnPrevious.page</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilke sider som skal valideres når brukeren velger neste-knappen. Tillatte verdier: "current", "currentAndPrevious", "all".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonprevious.show">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnPrevious.show">validateOnPrevious.show</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over valideringstypene som skal vises.</div></div>
</details>
