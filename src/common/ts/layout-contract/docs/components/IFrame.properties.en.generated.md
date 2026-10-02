The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;IFrame&quot;">Type: <span class="component-property-value">&quot;IFrame&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Identifies which component type this configuration represents.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings">textResourceBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Connects component texts to text resources or expressions.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.title">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.title">textResourceBindings.title</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The content of the IFrame. Can for example be set to a string containing HTML, a text resource key, or an expression looking up a value from the data model</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="sandbox">
  <div class="component-property-summary">
    <span class="component-property-name" title="sandbox">sandbox</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="sandbox.allowpopups">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="sandbox.allowPopups">sandbox.allowPopups</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Sets "allow-popups" in the sandbox attribute on the iframe. See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="sandbox.allowpopupstoescapesandbox">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="sandbox.allowPopupsToEscapeSandbox">sandbox.allowPopupsToEscapeSandbox</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Sets "allow-popups-to-escape-sandbox" in the sandbox attribute on the iframe. See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox</div></div>
</details>
