The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Grid&quot;">Type: <span class="component-property-value">&quot;Grid&quot;</span></span>
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

<details class="card adocs-expand adocs-expand-small component-property" id="labelsettings">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="labelSettings">labelSettings</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Controls how the component label is displayed.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="labelsettings.optionalindicator">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="labelSettings.optionalIndicator">labelSettings.optionalIndicator</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Show optional indicator on label</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Label text/title shown above the component</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Label description shown above the component, below the title</div></div>
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
    </div>

  </div>
</details>

<details class="component-property-group" id="rows">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rows">rows</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of rows in this grid</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].header">rows[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].readOnly">rows[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions">rows[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.width">rows[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.alignText">rows[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].columnOptions.textOverflow">rows[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.textOverflow.lineWrap">rows[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.textOverflow.maxHeight">rows[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].columnOptions.hidden">rows[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells">rows[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of cells in this row</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].component">rows[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">ID of the component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].text">rows[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Text to display (can also be a key in text resources)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].help">rows[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text to display</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].width">rows[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].alignText">rows[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].textOverflow">rows[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.lineWrap">rows[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].textOverflow.maxHeight">rows[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].hidden">rows[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].labelFrom">rows[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Set this to a component id to display the label from that component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions">rows[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.width">rows[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.alignText">rows[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rows[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow">rows[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.lineWrap">rows[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.textOverflow.maxHeight">rows[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].columnOptions.hidden">rows[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle">rows[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rows[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rows[].cells[].cellStyle.colSpan">rows[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>
    </div>

  </div>
</details>
