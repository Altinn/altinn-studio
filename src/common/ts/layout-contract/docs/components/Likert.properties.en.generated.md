The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Likert&quot;">Type: <span class="component-property-value">&quot;Likert&quot;</span></span>
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
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
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

<details class="card adocs-expand adocs-expand-small component-property" id="optionsid">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="optionsId">optionsId</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">ID of the option list to fetch from the server</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="queryparameters">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="queryParameters">queryParameters</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">A mapping of query string parameters to values. Will be appended to the URL when fetching options.</div></div>
</details>

<details class="component-property-group" id="options">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="options">options</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of static options</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="options[].label">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="options[].label">options[].label</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text displayed for the option.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="options[].value">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="options[].value">options[].value</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string | number | boolean | null">Type: <span class="component-property-value">string | number | boolean | null</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The value stored when the option is selected.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="options[].description">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="options[].description">options[].description</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional text displayed with the option.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="options[].helptext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="options[].helpText">options[].helpText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text for the option.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="secure">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="secure">secure</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Whether to call the secure API endpoint when fetching options from the server (allows for user/instance-specific options)</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="sortorder">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="sortOrder">sortOrder</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;asc&quot; | &quot;desc&quot;">Type: <span class="component-property-value">&quot;asc&quot; | &quot;desc&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Sorts the code list in either ascending or descending order by label. Allowed values: "asc", "desc".</div></div>
</details>

<details class="component-property-group" id="source">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="source">source</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allows for fetching options from the data model, pointing to a repeating group structure</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="source.datatype">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.dataType">source.dataType</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The datamodel where the repeating group data is stored. If not specified, the data model defined in the layout-set will be used.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="source.group">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.group">source.group</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The repeating group to base options on.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="source.label">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.label">source.label</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">A label of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="source.value">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.value">source.value</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Field in the group that should be used as value</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="source.description">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.description">source.description</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">A description of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="source.helptext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="source.helpText">source.helpText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">A help text for the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="optionfilter">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="optionFilter">optionFilter</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Setting this to an expression allows you to filter the list of options (the expression should return true to keep the option, false to remove it). To get the option value, use ["value"]. You can also use ["value", "label"] to get the label text resource id, likewise also "description" and "helpText".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="columns">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="columns">columns</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Add customization to the columns of the likert component</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="columns[].value">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="columns[].value">columns[].value</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="string | number">Type: <span class="component-property-value">string | number</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The value of the answer column</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="columns[].divider">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="columns[].divider">columns[].divider</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;before&quot; | &quot;after&quot; | &quot;both&quot;">Type: <span class="component-property-value">&quot;before&quot; | &quot;after&quot; | &quot;both&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose if the divider should be shown 'before', 'after' or on 'both' sides of the column. Allowed values: "before", "after", "both".</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The title of the group</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The description text for the Likert table.</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text shown in a tooltip when clicking the help button</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.leftcolumnheader">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.leftColumnHeader">textResourceBindings.leftColumnHeader</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The header text for the left column in the Likert table</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.questions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.questions">textResourceBindings.questions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The questions to be displayed in each row (use a dynamic text resource)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.questiondescriptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.questionDescriptions">textResourceBindings.questionDescriptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The descriptions to be displayed in each row (use a dynamic text resource)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.questionhelptexts">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.questionHelpTexts">textResourceBindings.questionHelpTexts</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The help texts to be displayed in each row (use a dynamic text resource)</div></div>
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
      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.answer">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.answer">dataModelBindings.answer</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Dot notation location for the answers. This must point to a property of the objects inside the question array. The answer for each question will be stored in the answer property of the corresponding question object. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.questions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.questions">dataModelBindings.questions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Dot notation location for a likert structure (array of objects), where the data is stored <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="filter">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="filter">filter</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Optionally filter specific rows within the likert group using start/stop indexes for displaying the desired ones(beware that start index starts at zero, and stop index starts at one, so {start, stop} = {0, 3} will display 3 rows, not 4)</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="filter[].key">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="filter[].key">filter[].key</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;start&quot; | &quot;stop&quot;">Type: <span class="component-property-value">&quot;start&quot; | &quot;stop&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allowed values: "start", "stop".</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="filter[].value">
  <div class="component-property-summary">
    <span class="component-property-name" title="filter[].value">filter[].value</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="string | number">Type: <span class="component-property-value">string | number</span></span>
    </span>
  </div>
</div>
