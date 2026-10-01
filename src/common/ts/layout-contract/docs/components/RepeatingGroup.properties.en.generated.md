The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;RepeatingGroup&quot;">Type: <span class="component-property-value">&quot;RepeatingGroup&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Identifies which component type this configuration represents.</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The title of the group (shown above each instance in a Summary)</div></div>
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
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The description text shown underneath the title</div></div>
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

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.addbuttonfull">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.addButtonFull">textResourceBindings.addButtonFull</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Add" button (overrides "addButton", and sets the full text for the button)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.addbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.addButton">textResourceBindings.addButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Add" button (used as a suffix after the default button text)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.savebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.saveButton">textResourceBindings.saveButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Save" button when the repeating group item is in edit mode</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.saveandnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.saveAndNextButton">textResourceBindings.saveAndNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Save and next" button when the repeating group item is in edit mode (only displayed if edit.saveAndNextButton is true)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.editbuttonclose">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.editButtonClose">textResourceBindings.editButtonClose</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Edit" button when the repeating group item is in edit mode (i.e. the user can close the edit mode)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.editbuttonopen">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.editButtonOpen">textResourceBindings.editButtonOpen</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Edit" button when the repeating group item is not in edit mode (i.e. the user can open the edit mode)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.paginationnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.paginationNextButton">textResourceBindings.paginationNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Next" button in pagination</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.paginationbackbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.paginationBackButton">textResourceBindings.paginationBackButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Back" button in pagination</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.multipagebackbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.multipageBackButton">textResourceBindings.multipageBackButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Back" button in multipage navigation</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.multipagenextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.multipageNextButton">textResourceBindings.multipageNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The text for the "Next" button in multipage navigation</div></div>
      </details>
    </div>

  </div>
</details>

<details class="component-property-group" id="rowsbefore">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rowsBefore">rowsBefore</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of rows in this grid</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].header">rowsBefore[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].readOnly">rowsBefore[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions">rowsBefore[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.width">rowsBefore[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.alignText">rowsBefore[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow">rowsBefore[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow.lineWrap">rowsBefore[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.textOverflow.maxHeight">rowsBefore[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].columnOptions.hidden">rowsBefore[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells">rowsBefore[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of cells in this row</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].component">rowsBefore[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">ID of the component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].text">rowsBefore[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Text to display (can also be a key in text resources)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].help">rowsBefore[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text to display</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].width">rowsBefore[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].alignText">rowsBefore[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow">rowsBefore[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.lineWrap">rowsBefore[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].textOverflow.maxHeight">rowsBefore[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].hidden">rowsBefore[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].labelFrom">rowsBefore[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Set this to a component id to display the label from that component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions">rowsBefore[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.width">rowsBefore[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.alignText">rowsBefore[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsbefore[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow">rowsBefore[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.lineWrap">rowsBefore[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.textOverflow.maxHeight">rowsBefore[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].columnOptions.hidden">rowsBefore[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle">rowsBefore[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsbefore[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsBefore[].cells[].cellStyle.colSpan">rowsBefore[].cells[].cellStyle.colSpan</span>
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

<details class="component-property-group" id="rowsafter">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="rowsAfter">rowsAfter</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of rows in this grid</div></div>
    <div class="component-property-list">
      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].header">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].header">rowsAfter[].header</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].readonly">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].readOnly">rowsAfter[].readOnly</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions">rowsAfter[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.width">rowsAfter[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.alignText">rowsAfter[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow">rowsAfter[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow.lineWrap">rowsAfter[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.textOverflow.maxHeight">rowsAfter[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].columnOptions.hidden">rowsAfter[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells">rowsAfter[].cells</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="(object | null | object | object)[]">Type: <span class="component-property-value">(object | null | object | object)[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The list of cells in this row</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].component">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].component">rowsAfter[].cells[].component</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">ID of the component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].text">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].text">rowsAfter[].cells[].text</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Text to display (can also be a key in text resources)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].help">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].help">rowsAfter[].cells[].help</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Help text to display</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">1</span></span>
            <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Number of columns this cell should span. Defaults to 1 if not set.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].width">rowsAfter[].cells[].width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].alignText">rowsAfter[].cells[].alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow">rowsAfter[].cells[].textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.lineWrap">rowsAfter[].cells[].textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].textOverflow.maxHeight">rowsAfter[].cells[].textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].hidden">rowsAfter[].cells[].hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].labelfrom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].labelFrom">rowsAfter[].cells[].labelFrom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Set this to a component id to display the label from that component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions">rowsAfter[].cells[].columnOptions</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Options for the row/column</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.width">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.width">rowsAfter[].cells[].columnOptions.width</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;auto&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Width of cell in % or 'auto'. Defaults to 'auto'</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.aligntext">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.alignText">rowsAfter[].cells[].columnOptions.alignText</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers. Allowed values: "left", "center", "right".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="rowsafter[].cells[].columnoptions.textoverflow">
        <div class="component-property-summary">
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow">rowsAfter[].cells[].columnOptions.textOverflow</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.linewrap">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.lineWrap">rowsAfter[].cells[].columnOptions.textOverflow.lineWrap</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Toggle line wrapping on or off. Defaults to true</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.textoverflow.maxheight">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.textOverflow.maxHeight">rowsAfter[].cells[].columnOptions.textOverflow.maxHeight</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">2</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Determines the number of lines to display in table cell before hiding the rest of the text with an ellipsis (...). Defaults to 2.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].columnoptions.hidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].columnOptions.hidden">rowsAfter[].cells[].columnOptions.hidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per column, and if it evaluates to true, the column will be hidden.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle">rowsAfter[].cells[].cellStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Additional properties for columns in the Grid component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="rowsafter[].cells[].cellstyle.colspan">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="rowsAfter[].cells[].cellStyle.colSpan">rowsAfter[].cells[].cellStyle.colSpan</span>
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

<details class="card adocs-expand adocs-expand-small component-property" id="removewhenhidden">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="removeWhenHidden">removeWhenHidden</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
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
      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.group">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.group">dataModelBindings.group</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Dot notation location for a repeating group structure (array of objects), where the data is stored <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>
    </div>
  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="validateonsaverow">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="validateOnSaveRow">validateOnSaveRow</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]">Type: <span class="component-property-value">&quot;Schema&quot; | &quot;Invalid&quot; | &quot;Component&quot; | &quot;Expression&quot; | &quot;CustomBackend&quot; | &quot;Required&quot; | &quot;AllExceptRequired&quot; | &quot;All&quot;[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of validation types to show</div></div>
</details>

<details class="component-property-group" id="edit">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="edit">edit</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
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
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;showTable&quot;</span></span>
            <span class="component-property-type" title="&quot;hideTable&quot; | &quot;showTable&quot; | &quot;showAll&quot; | &quot;onlyTable&quot;">Type: <span class="component-property-value">&quot;hideTable&quot; | &quot;showTable&quot; | &quot;showAll&quot; | &quot;onlyTable&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The mode of the repeating group Allowed values: "hideTable", "showTable", "showAll", "onlyTable".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.addbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.addButton">edit.addButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show the "Add" button</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.savebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.saveButton">edit.saveButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show the "Save" button</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.deletebutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.deleteButton">edit.deleteButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show the "Delete" button</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.editbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.editButton">edit.editButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show the "Edit" button</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.multipage">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.multiPage">edit.multiPage</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Turning this on makes it possible to display the edit mode for a repeating group with multiple inner pages. Every component referenced in the "children" property should have a prefix with the page number it should be displayed on (e.g. "1:component1", "2:component2", etc.)</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.openbydefault">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.openByDefault">edit.openByDefault</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | &quot;first&quot; | &quot;last&quot;">Type: <span class="component-property-value">boolean | &quot;first&quot; | &quot;last&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">If set to true, a row of the repeating group will be opened by default, if the group has no rows already. If set to "first" or "last", the first or last row will be opened by default</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.alertondelete">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.alertOnDelete">edit.alertOnDelete</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show an alert when the user clicks the "Delete" button, prompting them to confirm the deletion</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.saveandnextbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.saveAndNextButton">edit.saveAndNextButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether to show the "Save and next" button when editing a repeating group row. This button will save the current row and open the next row for editing.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.alwaysshowaddbutton">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.alwaysShowAddButton">edit.alwaysShowAddButton</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">If set to true, the "Add" button will always be shown, even if the user is currently editing another row</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.compactbuttons">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.compactButtons">edit.compactButtons</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">If true, edit and delete buttons in the table only show icons when the row is not in edit mode. Text will still be shown when the row is in edit mode.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="edit.buttonlayout">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="edit.buttonLayout">edit.buttonLayout</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;horizontal&quot;</span></span>
            <span class="component-property-type" title="&quot;horizontal&quot; | &quot;vertical&quot;">Type: <span class="component-property-value">&quot;horizontal&quot; | &quot;vertical&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">In desktop table view, controls how the edit and delete buttons are laid out. "horizontal" uses two table columns (edit and delete side by side). "vertical" uses a single button column with edit above delete, saving horizontal space. Does not apply to mobile/tablet layout. Can be combined with compactButtons. Allowed values: "horizontal", "vertical".</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="pagination">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="pagination">pagination</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Pagination options for the repeating group rows.</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="pagination.rowsperpage">
  <div class="component-property-summary">
    <span class="component-property-name" title="pagination.rowsPerPage">pagination.rowsPerPage</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="integer (1–∞)">Type: <span class="component-property-value">integer (1–∞)</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="maxcount">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="maxCount">maxCount</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="integer (1–∞)">Type: <span class="component-property-value">integer (1–∞)</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Maximum number of rows that can be added.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="mincount">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="minCount">minCount</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">0</span></span>
      <span class="component-property-type" title="integer (0–∞)">Type: <span class="component-property-value">integer (0–∞)</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Minimum number of rows that should be added. If the user has not added enough rows, the repeating group will show a validation error</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="tableheaders">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="tableHeaders">tableHeaders</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Array of component IDs that should be displayed as table headers. If not defined, all components referenced in the "children" property will be displayed as table headers</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="tablecolumns">
  <div class="component-property-summary">
    <span class="component-property-name" title="tableColumns">tableColumns</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="hiddenrow">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="hiddenRow">hiddenRow</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean indicating whether each row should be hidden. An expression will be evaluated per row, and if it evaluates to true, the row will be hidden. If set to true, all rows will be hidden.</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="stickyheader">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="stickyHeader">stickyHeader</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
      <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">If set to true, the header of the repeating group will be sticky</div></div>
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

<details class="component-property-group" id="addbutton">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="addButton">addButton</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
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
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;md&quot;</span></span>
            <span class="component-property-type" title="&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot;">Type: <span class="component-property-value">&quot;sm&quot; | &quot;md&quot; | &quot;lg&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The size of the button. Only effective using style of primary or secondary Allowed values: "sm", "md", "lg".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.textalign">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.textAlign">addButton.textAlign</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;center&quot;</span></span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Text align when using style of primary or secondary. Allowed values: "left", "center", "right".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.fullwidth">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.fullWidth">addButton.fullWidth</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Whether a link button should expand to full width</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="addbutton.position">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="addButton.position">addButton.position</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;left&quot; | &quot;center&quot; | &quot;right&quot;">Type: <span class="component-property-value">&quot;left&quot; | &quot;center&quot; | &quot;right&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Position the button left, center or right on the screen. Allowed values: "left", "center", "right".</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="children">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="children">children</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of child component IDs to show inside (will be repeated according to the number of rows in the data model binding)</div></div>
</details>
