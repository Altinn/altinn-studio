The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Tabs&quot;">Type: <span class="component-property-value">&quot;Tabs&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Identifies which component type this configuration represents.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="renderassummary">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="renderAsSummary">renderAsSummary</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Boolean value indicating if the component should be rendered as a summary. Defaults to false.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="forceshowinsummary">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="forceShowInSummary">forceShowInSummary</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Will force show the component in a summary even if hideEmptyFields is set to true in the summary component.</div></div>
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

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.summarytitle">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.summaryTitle">textResourceBindings.summaryTitle</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Title used in the summary view (overrides the default title)</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.summaryaccessibletitle">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.summaryAccessibleTitle">textResourceBindings.summaryAccessibleTitle</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Title used for aria-label on the edit button in the summary view (overrides the default and summary title)</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="size">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="size">size</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;medium&quot;</span></span>
      <span class="component-property-type" title="&quot;small&quot; | &quot;medium&quot; | &quot;large&quot;">Type: <span class="component-property-value">&quot;small&quot; | &quot;medium&quot; | &quot;large&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allowed values: "small", "medium", "large".</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="defaulttab">
  <div class="component-property-summary">
    <span class="component-property-name" title="defaultTab">defaultTab</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </div>
</div>

<details class="component-property-group" id="tabs">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="tabs">tabs</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="tabs[].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="tabs[].id">tabs[].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="tabs[].title">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tabs[].title">tabs[].title</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Title of the tab</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="tabs[].icon">
        <div class="component-property-summary">
          <span class="component-property-name" title="tabs[].icon">tabs[].icon</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="tabs[].children">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="tabs[].children">tabs[].children</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of component IDs that should be displayed in the Tab</div></div>
      </details>
    </div>

  </div>
</details>
