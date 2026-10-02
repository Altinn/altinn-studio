The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Map&quot;">Type: <span class="component-property-value">&quot;Map&quot;</span></span>
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
      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.simplebinding">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.simpleBinding">dataModelBindings.simpleBinding</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometries">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometries">dataModelBindings.geometries</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to an array of objects like {data: string, label: string} (these can also be configured via separate bindings) <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometrylabel">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometryLabel">dataModelBindings.geometryLabel</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to a string (defaults to a "label" property on the geometries array objects) <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometrydata">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometryData">dataModelBindings.geometryData</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to a string (defaults to a "data" property on the geometries array objects) <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometryiseditable">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometryIsEditable">dataModelBindings.geometryIsEditable</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to a boolean indicating if this geometry is editable. This has no default value, geometries will not be editable if this is not specified. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometryishidden">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometryIsHidden">dataModelBindings.geometryIsHidden</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to a boolean indicating if this geometry is hidden. Geometries will be visible by default if this is not specified. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="datamodelbindings.geometrystyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="dataModelBindings.geometryStyle">dataModelBindings.geometryStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Should point to a JSON-serialized Leaflet PathOptions object (e.g. '{"color":"#ff0000","weight":2,"fillOpacity":0.3}') used as the style for this geometry. Overrides the default style. Invalid JSON is ignored. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>
    </div>

  </div>
</details>

<details class="component-property-group" id="layers">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="layers">layers</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="(object | object)[]">Type: <span class="component-property-value">(object | object)[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].url">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].url">layers[type=TileLayer].url</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Url to a map tile. {z}/{x}/{y} will be replaced with tile coordinates, {s} will be replaced with a random subdomain if subdomains are given</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].attribution">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].attribution">layers[type=TileLayer].attribution</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Ascribing a work or remark to a particular unit for recognition</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].subdomains">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].subdomains">layers[type=TileLayer].subdomains</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">List of subdomains. Used for balancing the load on different map tiling servers. A random one will replace {s} in the defined url.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].type">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].type">layers[type=TileLayer].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;TileLayer&quot;</span></span>
            <span class="component-property-type" title="&quot;TileLayer&quot;">Type: <span class="component-property-value">&quot;TileLayer&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Type of the map layer</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].minzoom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].minZoom">layers[type=TileLayer].minZoom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">0</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The minimum zoom level for the layer</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=tilelayer].maxzoom">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=TileLayer].maxZoom">layers[type=TileLayer].maxZoom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">18</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The maximum zoom level for the layer</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].url">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].url">layers[type=WMS].url</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Url to a wms-type map server</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="layers[type=wms].attribution">
        <div class="component-property-summary">
          <span class="component-property-name" title="layers[type=WMS].attribution">layers[type=WMS].attribution</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="layers[type=wms].subdomains">
        <div class="component-property-summary">
          <span class="component-property-name" title="layers[type=WMS].subdomains">layers[type=WMS].subdomains</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="layers[type=wms].type">
        <div class="component-property-summary">
          <span class="component-property-name" title="layers[type=WMS].type">layers[type=WMS].type</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="&quot;WMS&quot;">Type: <span class="component-property-value">&quot;WMS&quot;</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].layers">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].layers">layers[type=WMS].layers</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Comma-separated list of one or more WMS layers to display. Sent as a prop to the WMS map server.</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].format">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].format">layers[type=WMS].format</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;image/jpeg&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The MIME type of the WMS tiles to request from the WMS server, as specified by the WMS standard. (use 'image/png' for layers with transparency).</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].version">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].version">layers[type=WMS].version</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;1.1.1&quot;</span></span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The version of the WMS standard to use</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].transparent">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].transparent">layers[type=WMS].transparent</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Whether the WMS layer should be transparent</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="layers[type=wms].uppercase">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="layers[type=WMS].uppercase">layers[type=WMS].uppercase</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Whether the WMS parameters should be uppercase</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="layers[type=wms].minzoom">
        <div class="component-property-summary">
          <span class="component-property-name" title="layers[type=WMS].minZoom">layers[type=WMS].minZoom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">0</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="layers[type=wms].maxzoom">
        <div class="component-property-summary">
          <span class="component-property-name" title="layers[type=WMS].maxZoom">layers[type=WMS].maxZoom</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">18</span></span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </div>
      </div>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="centerlocation">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="centerLocation">centerLocation</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Center location of the map</div></div>
</details>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="centerlocation.latitude">
  <div class="component-property-summary">
    <span class="component-property-name" title="centerLocation.latitude">centerLocation.latitude</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
    </span>
  </div>
</div>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="centerlocation.longitude">
  <div class="component-property-summary">
    <span class="component-property-name" title="centerLocation.longitude">centerLocation.longitude</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="number | expression&lt;number&gt;">Type: <span class="component-property-value">number | expression&lt;number&gt;</span></span>
    </span>
  </div>
</div>

<div class="card adocs-expand adocs-expand-small component-property component-property--static" id="zoom">
  <div class="component-property-summary">
    <span class="component-property-name" title="zoom">zoom</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
    </span>
  </div>
</div>

<details class="card adocs-expand adocs-expand-small component-property" id="geometrytype">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="geometryType">geometryType</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;GeoJSON&quot;</span></span>
      <span class="component-property-type" title="&quot;GeoJSON&quot; | &quot;WKT&quot;">Type: <span class="component-property-value">&quot;GeoJSON&quot; | &quot;WKT&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allowed values: "GeoJSON", "WKT".</div></div>
</details>

<details class="component-property-group" id="toolbar">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="toolbar">toolbar</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Sets which geometries the user is allowed to draw</div></div>
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="toolbar.polyline">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="toolbar.polyline">toolbar.polyline</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean allowing the user to draw lines on the map</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="toolbar.polygon">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="toolbar.polygon">toolbar.polygon</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean allowing the user to draw a polygon on the map</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="toolbar.rectangle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="toolbar.rectangle">toolbar.rectangle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean allowing the user to draw a rectangle on the map</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="toolbar.circle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="toolbar.circle">toolbar.circle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean allowing the user to draw a circle on the map</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="toolbar.marker">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="toolbar.marker">toolbar.marker</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Expression or boolean allowing the user to place multiple markers on the map</div></div>
      </details>
    </div>

  </div>
</details>
