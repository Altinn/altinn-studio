The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;CustomButton&quot;">Type: <span class="component-property-value">&quot;CustomButton&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Identifies which component type this configuration represents.</div></div>
</details>

<details class="component-property-group" id="actions">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="actions">actions</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="(object | object | object | object | object)[]">Type: <span class="component-property-value">(object | object | object | object | object)[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Actions to run when the user selects the button.</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].id">actions[type=ClientAction].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;nextPage&quot;">Type: <span class="component-property-value">&quot;nextPage&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].type">actions[type=ClientAction].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;ClientAction&quot;">Type: <span class="component-property-value">&quot;ClientAction&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].validation">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].validation">actions[type=ClientAction].validation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.page">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.page">actions[type=ClientAction].validation.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Which pages should be validated when the next button is clicked. Allowed values: "current", "currentAndPrevious", "all".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.show">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.show">actions[type=ClientAction].validation.show</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].id">actions[type=ClientAction].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;previousPage&quot;">Type: <span class="component-property-value">&quot;previousPage&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].type">actions[type=ClientAction].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;ClientAction&quot;">Type: <span class="component-property-value">&quot;ClientAction&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].validation">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].validation">actions[type=ClientAction].validation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.page">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.page">actions[type=ClientAction].validation.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Which pages should be validated when the next button is clicked. Allowed values: "current", "currentAndPrevious", "all".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.show">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.show">actions[type=ClientAction].validation.show</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].id">actions[type=ClientAction].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;navigateToPage&quot;">Type: <span class="component-property-value">&quot;navigateToPage&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].type">actions[type=ClientAction].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;ClientAction&quot;">Type: <span class="component-property-value">&quot;ClientAction&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].validation">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].validation">actions[type=ClientAction].validation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.page">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.page">actions[type=ClientAction].validation.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Which pages should be validated when the next button is clicked. Allowed values: "current", "currentAndPrevious", "all".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.show">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.show">actions[type=ClientAction].validation.show</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].metadata">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].metadata">actions[type=ClientAction].metadata</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].metadata.page">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].metadata.page">actions[type=ClientAction].metadata.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].id">actions[type=ClientAction].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;closeSubform&quot;">Type: <span class="component-property-value">&quot;closeSubform&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].type">actions[type=ClientAction].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;ClientAction&quot;">Type: <span class="component-property-value">&quot;ClientAction&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=clientaction].validation">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ClientAction].validation">actions[type=ClientAction].validation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.page">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.page">actions[type=ClientAction].validation.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Which pages should be validated when the next button is clicked. Allowed values: "current", "currentAndPrevious", "all".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=clientaction].validation.show">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ClientAction].validation.show">actions[type=ClientAction].validation.show</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=serveraction].id">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ServerAction].id">actions[type=ServerAction].id</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=serveraction].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ServerAction].type">actions[type=ServerAction].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;ServerAction&quot;">Type: <span class="component-property-value">&quot;ServerAction&quot;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="actions[type=serveraction].validation">
        <div class="component-property-summary">
          <span class="component-property-name" title="actions[type=ServerAction].validation">actions[type=ServerAction].validation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=serveraction].validation.page">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ServerAction].validation.page">actions[type=ServerAction].validation.page</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;">Type: <span class="component-property-value">&quot;current&quot; | &quot;currentAndPrevious&quot; | &quot;all&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Which pages should be validated when the next button is clicked. Allowed values: "current", "currentAndPrevious", "all".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="actions[type=serveraction].validation.show">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="actions[type=ServerAction].validation.show">actions[type=ServerAction].validation.show</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="buttonstyle">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="buttonStyle">buttonStyle</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;secondary&quot;</span></span>
      <span class="component-property-type" title="&quot;primary&quot; | &quot;secondary&quot; | &quot;tertiary&quot;">Type: <span class="component-property-value">&quot;primary&quot; | &quot;secondary&quot; | &quot;tertiary&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The style/color scheme of the button. Allowed values: "primary", "secondary", "tertiary".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="buttoncolor">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="buttonColor">buttonColor</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;first&quot; | &quot;second&quot; | &quot;success&quot; | &quot;danger&quot;">Type: <span class="component-property-value">&quot;first&quot; | &quot;second&quot; | &quot;success&quot; | &quot;danger&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The color scheme of the button. Allowed values: "first", "second", "success", "danger".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="buttonsize">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="buttonSize">buttonSize</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot; | &quot;small&quot; | &quot;medium&quot; | &quot;large&quot;">Type: <span class="component-property-value">&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot; | &quot;small&quot; | &quot;medium&quot; | &quot;large&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The size of the button. Allowed values: "sm", "md", "lg", "small", "medium", "large".</div></div>
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
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The title/text on the button</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.tabletitle">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings.tableTitle">textResourceBindings.tableTitle</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The title/text for the button when rendered in a table</div></div>
</details>
