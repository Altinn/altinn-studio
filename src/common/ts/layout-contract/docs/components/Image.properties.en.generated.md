The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Image&quot;">Type: <span class="component-property-value">&quot;Image&quot;</span></span>
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

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.alttextimg">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.altTextImg">textResourceBindings.altTextImg</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Alternative text for the image (for screen readers).</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.help">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.help">textResourceBindings.help</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text for the image (shown in help text tooltip/popup)</div></div>
</details>

<details class="component-property-group" id="image">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="image">image</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Configures the image source, width, and alignment.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="image.src">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="image.src">image.src</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Image sources for each supported language.</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="image.src.nb">
        <div class="component-property-summary">
          <span class="component-property-name" title="image.src.nb">image.src.nb</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="image.src.nn">
        <div class="component-property-summary">
          <span class="component-property-name" title="image.src.nn">image.src.nn</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="image.src.en">
        <div class="component-property-summary">
          <span class="component-property-name" title="image.src.en">image.src.en</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="image.width">
        <div class="component-property-summary">
          <span class="component-property-name" title="image.width">image.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="image.align">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="image.align">image.align</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;flex-start&quot; | &quot;center&quot; | &quot;flex-end&quot; | &quot;space-between&quot; | &quot;space-around&quot; | &quot;space-evenly&quot;">Type: <span class="component-property-value">&quot;flex-start&quot; | &quot;center&quot; | &quot;flex-end&quot; | &quot;space-between&quot; | &quot;space-around&quot; | &quot;space-evenly&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Justification/alignment of the image Allowed values: "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly".</div></div>
      </details>
    </div>

  </div>
</details>
