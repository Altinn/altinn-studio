Komponenten støtter også de [felles komponentegenskapene](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="&quot;Summary&quot;">Type: <span class="component-property-value">&quot;Summary&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir hvilken komponenttype konfigurasjonen gjelder.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="componentref">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="componentRef">componentRef</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Påkrevd</span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">ID-en til komponenten som oppsummeringen gjelder.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="largegroup">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="largeGroup">largeGroup</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir om oppsummeringen av den repeterende gruppen skal vises i stort format.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="excludedchildren">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="excludedChildren">excludedChildren</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Liste over komponent-ID-er som ikke skal vises i oppsummeringen av en repeterende gruppe.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings">textResourceBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Kobler tekstene i komponenten til tekstressurser eller uttrykk.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.returntosummarybuttontitle">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.returnToSummaryButtonTitle">textResourceBindings.returnToSummaryButtonTitle</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Angir teksten i NavigationButtons-komponenten etter at brukeren har valgt «Endre» i oppsummeringen.</div></div>
</details>

<details class="component-property-group" id="display">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="display">display</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Valgfri</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Valgfrie egenskaper som styrer hvordan oppsummeringen vises.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="display.hidechangebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="display.hideChangeButton">display.hideChangeButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Skjuler endringsknappen i oppsummeringskomponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="display.hidevalidationmessages">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="display.hideValidationMessages">display.hideValidationMessages</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Skjuler valideringsmeldingene når komponenten vises i Summary.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="display.usecomponentgrid">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="display.useComponentGrid">display.useComponentGrid</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Lar oppsummeringskomponenten bruke rutenettinnstillingene fra komponenten den refererer til.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="display.hidebottomborder">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="display.hideBottomBorder">display.hideBottomBorder</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Skjuler den blå, stiplede linjen under oppsummeringskomponenten.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="display.nextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="display.nextButton">display.nextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Valgfri</span>
            <span class="component-property-default">Standardverdi: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Viser en «Neste»-knapp i tillegg til knappen som går tilbake til oppsummeringen.</div></div>
      </details>
    </div>

  </div>
</details>
