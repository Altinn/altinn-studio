The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;PersonLookup&quot;">Type: <span class="component-property-value">&quot;PersonLookup&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Identifies which component type this configuration represents.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="readonly">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="readOnly">readOnly</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Boolean value or expression indicating if the component should be read only/disabled. Defaults to false. <br /> <i>Please note that even with read-only fields in components, it may currently be possible to update the field by modifying the request sent to the API or through a direct API call.<i/></div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="required">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="required">required</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Boolean value or expression indicating if the component should be required. Defaults to false.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="showvalidations">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="showValidations">showValidations</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
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

<details class="component-property-group" id="textresourcebindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="textResourceBindings">textResourceBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Connects component texts to text resources or expressions.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.tabletitle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.tableTitle">textResourceBindings.tableTitle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Title used in the table view (overrides the default title)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.shortname">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.shortName">textResourceBindings.shortName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Alternative name used for required validation messages (overrides the default title)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.requiredvalidation">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.requiredValidation">textResourceBindings.requiredValidation</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Full validation message shown when the component is required and no value has been entered (overrides both the default and shortName)</div></div>
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

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.title">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.title">textResourceBindings.title</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The title of the component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.description">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.description">textResourceBindings.description</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Description, optionally shown below the title</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text, optionally shown next to the title</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="removewhenhidden">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="removeWhenHidden">removeWhenHidden</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Override the logic cleaning data for hidden components at task end, if you want to keep data referenced in hidden components. Currently only has effect if AppSettings.RemoveHiddenData is enabled.</div></div>
</details>

<details class="component-property-group" id="datamodelbindings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="dataModelBindings">dataModelBindings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Connects component values to fields in the data model.</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.ssn">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.ssn">dataModelBindings.ssn</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store the ssn of the person to look up. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.fullname">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.fullName">dataModelBindings.fullName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store the name of the person to look up. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.lastname">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.lastName">dataModelBindings.lastName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store the last name of the person to look up. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.middlename">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.middleName">dataModelBindings.middleName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store the middle name of the person to look up. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.firstname">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.firstName">dataModelBindings.firstName</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store the first name of the person to look up. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>
    </div>

  </div>
</details>
