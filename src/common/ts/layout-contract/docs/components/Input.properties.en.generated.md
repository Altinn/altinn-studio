The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Input&quot;">Type: <span class="component-property-value">&quot;Input&quot;</span></span>
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

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.prefix">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.prefix">textResourceBindings.prefix</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Prefix shown before the input field</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="textresourcebindings.suffix">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="textResourceBindings.suffix">textResourceBindings.suffix</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Suffix shown after the input field</div></div>
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
      <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
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
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="data model binding">Type: <span class="component-property-value"><a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">data model binding</a></span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Describes the location in the data model where the component should store its value(s). A simple binding is used for components that only store a single value, usually a string. <a href="/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">How to use data model bindings.</a></div></div>
      </details>
    </div>
  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="savewhiletyping">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="saveWhileTyping">saveWhileTyping</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">true</span></span>
      <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Lets you control how long we wait before saving the value locally while typing. This value is usually also used to determine how long we wait before saving the value to the server. The default value is 400 milliseconds.</div></div>
</details>

<details class="component-property-group" id="formatting">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="formatting">formatting</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="object">Type: <span class="component-property-value">object</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="formatting.currency">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="formatting.currency">formatting.currency</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;AED&quot; | &quot;AFN&quot; | &quot;ALL&quot; | &quot;AMD&quot; | &quot;ANG&quot; | &quot;AOA&quot; | &quot;ARS&quot; | &quot;AUD&quot; | &quot;AWG&quot; | &quot;AZN&quot; | &quot;BAM&quot; | &quot;BBD&quot; | &quot;BDT&quot; | &quot;BGN&quot; | &quot;BHD&quot; | &quot;BIF&quot; | &quot;BMD&quot; | &quot;BND&quot; | &quot;BOB&quot; | &quot;BOV&quot; | &quot;BRL&quot; | &quot;BSD&quot; | &quot;BTN&quot; | &quot;BWP&quot; | &quot;BYN&quot; | &quot;BZD&quot; | &quot;CAD&quot; | &quot;CDF&quot; | &quot;CHE&quot; | &quot;CHF&quot; | &quot;CHW&quot; | &quot;CLF&quot; | &quot;CLP&quot; | &quot;CNY&quot; | &quot;COP&quot; | &quot;COU&quot; | &quot;CRC&quot; | &quot;CUC&quot; | &quot;CUP&quot; | &quot;CVE&quot; | &quot;CZK&quot; | &quot;DJF&quot; | &quot;DKK&quot; | &quot;DOP&quot; | &quot;DZD&quot; | &quot;EGP&quot; | &quot;ERN&quot; | &quot;ETB&quot; | &quot;EUR&quot; | &quot;FJD&quot; | &quot;FKP&quot; | &quot;GBP&quot; | &quot;GEL&quot; | &quot;GHS&quot; | &quot;GIP&quot; | &quot;GMD&quot; | &quot;GNF&quot; | &quot;GTQ&quot; | &quot;GYD&quot; | &quot;HKD&quot; | &quot;HNL&quot; | &quot;HTG&quot; | &quot;HUF&quot; | &quot;IDR&quot; | &quot;ILS&quot; | &quot;INR&quot; | &quot;IQD&quot; | &quot;IRR&quot; | &quot;ISK&quot; | &quot;JMD&quot; | &quot;JOD&quot; | &quot;JPY&quot; | &quot;KES&quot; | &quot;KGS&quot; | &quot;KHR&quot; | &quot;KMF&quot; | &quot;KPW&quot; | &quot;KRW&quot; | &quot;KWD&quot; | &quot;KYD&quot; | &quot;KZT&quot; | &quot;LAK&quot; | &quot;LBP&quot; | &quot;LKR&quot; | &quot;LRD&quot; | &quot;LSL&quot; | &quot;LYD&quot; | &quot;MAD&quot; | &quot;MDL&quot; | &quot;MGA&quot; | &quot;MKD&quot; | &quot;MMK&quot; | &quot;MNT&quot; | &quot;MOP&quot; | &quot;MRU&quot; | &quot;MUR&quot; | &quot;MVR&quot; | &quot;MWK&quot; | &quot;MXN&quot; | &quot;MXV&quot; | &quot;MYR&quot; | &quot;MZN&quot; | &quot;NAD&quot; | &quot;NGN&quot; | &quot;NIO&quot; | &quot;NOK&quot; | &quot;NPR&quot; | &quot;NZD&quot; | &quot;OMR&quot; | &quot;PAB&quot; | &quot;PEN&quot; | &quot;PGK&quot; | &quot;PHP&quot; | &quot;PKR&quot; | &quot;PLN&quot; | &quot;PYG&quot; | &quot;QAR&quot; | &quot;RON&quot; | &quot;RSD&quot; | &quot;RUB&quot; | &quot;RWF&quot; | &quot;SAR&quot; | &quot;SBD&quot; | &quot;SCR&quot; | &quot;SDG&quot; | &quot;SEK&quot; | &quot;SGD&quot; | &quot;SHP&quot; | &quot;SLE&quot; | &quot;SLL&quot; | &quot;SOS&quot; | &quot;SRD&quot; | &quot;SSP&quot; | &quot;STN&quot; | &quot;SVC&quot; | &quot;SYP&quot; | &quot;SZL&quot; | &quot;THB&quot; | &quot;TJS&quot; | &quot;TMT&quot; | &quot;TND&quot; | &quot;TOP&quot; | &quot;TRY&quot; | &quot;TTD&quot; | &quot;TWD&quot; | &quot;TZS&quot; | &quot;UAH&quot; | &quot;UGX&quot; | &quot;USD&quot; | &quot;USN&quot; | &quot;UYI&quot; | &quot;UYU&quot; | &quot;UYW&quot; | &quot;UZS&quot; | &quot;VED&quot; | &quot;VES&quot; | &quot;VND&quot; | &quot;VUV&quot; | &quot;WST&quot; | &quot;XAF&quot; | &quot;XCD&quot; | &quot;XDR&quot; | &quot;XOF&quot; | &quot;XPF&quot; | &quot;XSU&quot; | &quot;XUA&quot; | &quot;YER&quot; | &quot;ZAR&quot; | &quot;ZMW&quot; | &quot;ZWL&quot;">Type: <span class="component-property-value">&quot;AED&quot; | &quot;AFN&quot; | &quot;ALL&quot; | &quot;AMD&quot; | &quot;ANG&quot; | &quot;AOA&quot; | &quot;ARS&quot; | &quot;AUD&quot; | &quot;AWG&quot; | &quot;AZN&quot; | &quot;BAM&quot; | &quot;BBD&quot; | &quot;BDT&quot; | &quot;BGN&quot; | &quot;BHD&quot; | &quot;BIF&quot; | &quot;BMD&quot; | &quot;BND&quot; | &quot;BOB&quot; | &quot;BOV&quot; | &quot;BRL&quot; | &quot;BSD&quot; | &quot;BTN&quot; | &quot;BWP&quot; | &quot;BYN&quot; | &quot;BZD&quot; | &quot;CAD&quot; | &quot;CDF&quot; | &quot;CHE&quot; | &quot;CHF&quot; | &quot;CHW&quot; | &quot;CLF&quot; | &quot;CLP&quot; | &quot;CNY&quot; | &quot;COP&quot; | &quot;COU&quot; | &quot;CRC&quot; | &quot;CUC&quot; | &quot;CUP&quot; | &quot;CVE&quot; | &quot;CZK&quot; | &quot;DJF&quot; | &quot;DKK&quot; | &quot;DOP&quot; | &quot;DZD&quot; | &quot;EGP&quot; | &quot;ERN&quot; | &quot;ETB&quot; | &quot;EUR&quot; | &quot;FJD&quot; | &quot;FKP&quot; | &quot;GBP&quot; | &quot;GEL&quot; | &quot;GHS&quot; | &quot;GIP&quot; | &quot;GMD&quot; | &quot;GNF&quot; | &quot;GTQ&quot; | &quot;GYD&quot; | &quot;HKD&quot; | &quot;HNL&quot; | &quot;HTG&quot; | &quot;HUF&quot; | &quot;IDR&quot; | &quot;ILS&quot; | &quot;INR&quot; | &quot;IQD&quot; | &quot;IRR&quot; | &quot;ISK&quot; | &quot;JMD&quot; | &quot;JOD&quot; | &quot;JPY&quot; | &quot;KES&quot; | &quot;KGS&quot; | &quot;KHR&quot; | &quot;KMF&quot; | &quot;KPW&quot; | &quot;KRW&quot; | &quot;KWD&quot; | &quot;KYD&quot; | &quot;KZT&quot; | &quot;LAK&quot; | &quot;LBP&quot; | &quot;LKR&quot; | &quot;LRD&quot; | &quot;LSL&quot; | &quot;LYD&quot; | &quot;MAD&quot; | &quot;MDL&quot; | &quot;MGA&quot; | &quot;MKD&quot; | &quot;MMK&quot; | &quot;MNT&quot; | &quot;MOP&quot; | &quot;MRU&quot; | &quot;MUR&quot; | &quot;MVR&quot; | &quot;MWK&quot; | &quot;MXN&quot; | &quot;MXV&quot; | &quot;MYR&quot; | &quot;MZN&quot; | &quot;NAD&quot; | &quot;NGN&quot; | &quot;NIO&quot; | &quot;NOK&quot; | &quot;NPR&quot; | &quot;NZD&quot; | &quot;OMR&quot; | &quot;PAB&quot; | &quot;PEN&quot; | &quot;PGK&quot; | &quot;PHP&quot; | &quot;PKR&quot; | &quot;PLN&quot; | &quot;PYG&quot; | &quot;QAR&quot; | &quot;RON&quot; | &quot;RSD&quot; | &quot;RUB&quot; | &quot;RWF&quot; | &quot;SAR&quot; | &quot;SBD&quot; | &quot;SCR&quot; | &quot;SDG&quot; | &quot;SEK&quot; | &quot;SGD&quot; | &quot;SHP&quot; | &quot;SLE&quot; | &quot;SLL&quot; | &quot;SOS&quot; | &quot;SRD&quot; | &quot;SSP&quot; | &quot;STN&quot; | &quot;SVC&quot; | &quot;SYP&quot; | &quot;SZL&quot; | &quot;THB&quot; | &quot;TJS&quot; | &quot;TMT&quot; | &quot;TND&quot; | &quot;TOP&quot; | &quot;TRY&quot; | &quot;TTD&quot; | &quot;TWD&quot; | &quot;TZS&quot; | &quot;UAH&quot; | &quot;UGX&quot; | &quot;USD&quot; | &quot;USN&quot; | &quot;UYI&quot; | &quot;UYU&quot; | &quot;UYW&quot; | &quot;UZS&quot; | &quot;VED&quot; | &quot;VES&quot; | &quot;VND&quot; | &quot;VUV&quot; | &quot;WST&quot; | &quot;XAF&quot; | &quot;XCD&quot; | &quot;XDR&quot; | &quot;XOF&quot; | &quot;XPF&quot; | &quot;XSU&quot; | &quot;XUA&quot; | &quot;YER&quot; | &quot;ZAR&quot; | &quot;ZMW&quot; | &quot;ZWL&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Enables currency to be language sensitive based on selected app language. Note: parts that already exist in number property are not overridden by this prop. Allowed values: "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BOV", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHE", "CHF", "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MXV", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "USN", "UYI", "UYU", "UYW", "UZS", "VED", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", "XOF", "XPF", "XSU", "XUA", "YER", "ZAR", "ZMW", "ZWL".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="formatting.unit">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="formatting.unit">formatting.unit</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;celsius&quot; | &quot;centimeter&quot; | &quot;day&quot; | &quot;degree&quot; | &quot;foot&quot; | &quot;gram&quot; | &quot;hectare&quot; | &quot;hour&quot; | &quot;inch&quot; | &quot;kilogram&quot; | &quot;kilometer&quot; | &quot;liter&quot; | &quot;meter&quot; | &quot;milliliter&quot; | &quot;millimeter&quot; | &quot;millisecond&quot; | &quot;minute&quot; | &quot;month&quot; | &quot;percent&quot; | &quot;second&quot; | &quot;week&quot; | &quot;year&quot;">Type: <span class="component-property-value">&quot;celsius&quot; | &quot;centimeter&quot; | &quot;day&quot; | &quot;degree&quot; | &quot;foot&quot; | &quot;gram&quot; | &quot;hectare&quot; | &quot;hour&quot; | &quot;inch&quot; | &quot;kilogram&quot; | &quot;kilometer&quot; | &quot;liter&quot; | &quot;meter&quot; | &quot;milliliter&quot; | &quot;millimeter&quot; | &quot;millisecond&quot; | &quot;minute&quot; | &quot;month&quot; | &quot;percent&quot; | &quot;second&quot; | &quot;week&quot; | &quot;year&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Enables unit along with thousand and decimal separators to be language sensitive based on selected app language. They are configured in number property. Note: parts that already exist in number property are not overridden by this prop. Allowed values: "celsius", "centimeter", "day", "degree", "foot", "gram", "hectare", "hour", "inch", "kilogram", "kilometer", "liter", "meter", "milliliter", "millimeter", "millisecond", "minute", "month", "percent", "second", "week", "year".</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="formatting.position">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="formatting.position">formatting.position</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;prefix&quot; | &quot;suffix&quot;">Type: <span class="component-property-value">&quot;prefix&quot; | &quot;suffix&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Display the unit as prefix or suffix. Default is prefix. (Use only when using currency or unit options) Allowed values: "prefix", "suffix".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number">formatting.number</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="object | object">Type: <span class="component-property-value">object | object</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.format">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.format">formatting.number.format</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required is-required">Required</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.mask">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.mask">formatting.number.mask</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | string[]">Type: <span class="component-property-value">string | string[]</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.allowemptyformatting">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.allowEmptyFormatting">formatting.number.allowEmptyFormatting</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.patternchar">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.patternChar">formatting.number.patternChar</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.thousandseparator">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.thousandSeparator">formatting.number.thousandSeparator</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">false</span></span>
            <span class="component-property-type" title="boolean | expression&lt;boolean&gt; | string | expression&lt;string&gt;">Type: <span class="component-property-value">boolean | expression&lt;boolean&gt; | string | expression&lt;string&gt;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.decimalseparator">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.decimalSeparator">formatting.number.decimalSeparator</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;.&quot;</span></span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.alloweddecimalseparators">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.allowedDecimalSeparators">formatting.number.allowedDecimalSeparators</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="formatting.number.thousandsgroupstyle">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="formatting.number.thousandsGroupStyle">formatting.number.thousandsGroupStyle</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="&quot;thousand&quot; | &quot;lakh&quot; | &quot;wan&quot; | &quot;none&quot;">Type: <span class="component-property-value">&quot;thousand&quot; | &quot;lakh&quot; | &quot;wan&quot; | &quot;none&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allowed values: "thousand", "lakh", "wan", "none".</div></div>
      </details>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.decimalscale">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.decimalScale">formatting.number.decimalScale</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="number">Type: <span class="component-property-value">number</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.fixeddecimalscale">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.fixedDecimalScale">formatting.number.fixedDecimalScale</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.allownegative">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.allowNegative">formatting.number.allowNegative</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.allowleadingzeros">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.allowLeadingZeros">formatting.number.allowLeadingZeros</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="boolean">Type: <span class="component-property-value">boolean</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.suffix">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.suffix">formatting.number.suffix</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </div>
      </div>

      <div class="card adocs-expand adocs-expand-small component-property component-property--static" id="formatting.number.prefix">
        <div class="component-property-summary">
          <span class="component-property-name" title="formatting.number.prefix">formatting.number.prefix</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string | expression&lt;string&gt;">Type: <span class="component-property-value">string | expression&lt;string&gt;</span></span>
          </span>
        </div>
      </div>

      <details class="card adocs-expand adocs-expand-small component-property" id="formatting.align">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="formatting.align">formatting.align</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-default">Default: <span class="component-property-value">&quot;left&quot;</span></span>
            <span class="component-property-type" title="&quot;right&quot; | &quot;center&quot; | &quot;left&quot;">Type: <span class="component-property-value">&quot;right&quot; | &quot;center&quot; | &quot;left&quot;</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Allowed values: "right", "center", "left".</div></div>
      </details>
    </div>

  </div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="variant">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="variant">variant</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;text&quot;</span></span>
      <span class="component-property-type" title="&quot;text&quot; | &quot;search&quot;">Type: <span class="component-property-value">&quot;text&quot; | &quot;search&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The variant of the input field (text or search). Allowed values: "text", "search".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="autocomplete">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="autocomplete">autocomplete</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="&quot;on&quot; | &quot;off&quot; | &quot;name&quot; | &quot;honorific-prefix&quot; | &quot;given-name&quot; | &quot;additional-name&quot; | &quot;family-name&quot; | &quot;honorific-suffix&quot; | &quot;nickname&quot; | &quot;email&quot; | &quot;username&quot; | &quot;new-password&quot; | &quot;current-password&quot; | &quot;one-time-code&quot; | &quot;organization-title&quot; | &quot;organization&quot; | &quot;street-address&quot; | &quot;address-line1&quot; | &quot;address-line2&quot; | &quot;address-line3&quot; | &quot;address-level4&quot; | &quot;address-level3&quot; | &quot;address-level2&quot; | &quot;address-level1&quot; | &quot;country&quot; | &quot;country-name&quot; | &quot;postal-code&quot; | &quot;cc-name&quot; | &quot;cc-given-name&quot; | &quot;cc-additional-name&quot; | &quot;cc-family-name&quot; | &quot;cc-number&quot; | &quot;cc-exp&quot; | &quot;cc-exp-month&quot; | &quot;cc-exp-year&quot; | &quot;cc-csc&quot; | &quot;cc-type&quot; | &quot;transaction-currency&quot; | &quot;transaction-amount&quot; | &quot;language&quot; | &quot;bday&quot; | &quot;bday-day&quot; | &quot;bday-month&quot; | &quot;bday-year&quot; | &quot;sex&quot; | &quot;tel&quot; | &quot;tel-country-code&quot; | &quot;tel-national&quot; | &quot;tel-area-code&quot; | &quot;tel-local&quot; | &quot;tel-extension&quot; | &quot;url&quot; | &quot;photo&quot;">Type: <span class="component-property-value">&quot;on&quot; | &quot;off&quot; | &quot;name&quot; | &quot;honorific-prefix&quot; | &quot;given-name&quot; | &quot;additional-name&quot; | &quot;family-name&quot; | &quot;honorific-suffix&quot; | &quot;nickname&quot; | &quot;email&quot; | &quot;username&quot; | &quot;new-password&quot; | &quot;current-password&quot; | &quot;one-time-code&quot; | &quot;organization-title&quot; | &quot;organization&quot; | &quot;street-address&quot; | &quot;address-line1&quot; | &quot;address-line2&quot; | &quot;address-line3&quot; | &quot;address-level4&quot; | &quot;address-level3&quot; | &quot;address-level2&quot; | &quot;address-level1&quot; | &quot;country&quot; | &quot;country-name&quot; | &quot;postal-code&quot; | &quot;cc-name&quot; | &quot;cc-given-name&quot; | &quot;cc-additional-name&quot; | &quot;cc-family-name&quot; | &quot;cc-number&quot; | &quot;cc-exp&quot; | &quot;cc-exp-month&quot; | &quot;cc-exp-year&quot; | &quot;cc-csc&quot; | &quot;cc-type&quot; | &quot;transaction-currency&quot; | &quot;transaction-amount&quot; | &quot;language&quot; | &quot;bday&quot; | &quot;bday-day&quot; | &quot;bday-month&quot; | &quot;bday-year&quot; | &quot;sex&quot; | &quot;tel&quot; | &quot;tel-country-code&quot; | &quot;tel-national&quot; | &quot;tel-area-code&quot; | &quot;tel-local&quot; | &quot;tel-extension&quot; | &quot;url&quot; | &quot;photo&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The HTML autocomplete attribute helps browsers suggest or autofill input values based on the expected type of data. Allowed values: "on", "off", "name", "honorific-prefix", "given-name", "additional-name", "family-name", "honorific-suffix", "nickname", "email", "username", "new-password", "current-password", "one-time-code", "organization-title", "organization", "street-address", "address-line1", "address-line2", "address-line3", "address-level4", "address-level3", "address-level2", "address-level1", "country", "country-name", "postal-code", "cc-name", "cc-given-name", "cc-additional-name", "cc-family-name", "cc-number", "cc-exp", "cc-exp-month", "cc-exp-year", "cc-csc", "cc-type", "transaction-currency", "transaction-amount", "language", "bday", "bday-day", "bday-month", "bday-year", "sex", "tel", "tel-country-code", "tel-national", "tel-area-code", "tel-local", "tel-extension", "url", "photo".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="maxlength">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="maxLength">maxLength</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-type" title="integer">Type: <span class="component-property-value">integer</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Max length of the input field. Will add a counter to let the user know how many characters are left.</div></div>
</details>
