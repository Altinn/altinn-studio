The component also supports the [common component properties](../common-properties/).

<details class="card adocs-expand adocs-expand-small component-property" id="type">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="type">type</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;Cards&quot;">Type: <span class="component-property-value">&quot;Cards&quot;</span></span>
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

<details class="card adocs-expand adocs-expand-small component-property" id="mediaposition">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="mediaPosition">mediaPosition</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;top&quot;</span></span>
      <span class="component-property-type" title="&quot;top&quot; | &quot;bottom&quot;">Type: <span class="component-property-value">&quot;top&quot; | &quot;bottom&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Position of the media (image/video/audio) in each card Allowed values: "top", "bottom".</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="minmediaheight">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="minMediaHeight">minMediaHeight</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;150px&quot;</span></span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Fixed minimum height of media (if media is present)</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="minwidth">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="minWidth">minWidth</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required">Optional</span>
      <span class="component-property-default">Default: <span class="component-property-value">&quot;250px&quot;</span></span>
      <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Fixed minimum width of the card</div></div>
</details>

<details class="card adocs-expand adocs-expand-small component-property" id="color">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="color">color</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="&quot;neutral&quot; | &quot;subtle&quot;">Type: <span class="component-property-value">&quot;neutral&quot; | &quot;subtle&quot;</span></span>
    </span>
  </summary>
  <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">The color style for these cards Allowed values: "neutral", "subtle".</div></div>
</details>

<details class="component-property-group" id="cards">
  <summary class="component-property-summary">
    <span class="component-property-chevron" aria-hidden="true"></span>
    <span class="component-property-name" title="cards">cards</span>
    <span class="component-property-summary-meta">
      <span class="component-property-required is-required">Required</span>
      <span class="component-property-type" title="object[]">Type: <span class="component-property-value">object[]</span></span>
    </span>
  </summary>
  <div class="component-property-group-content">
    <div class="component-property-list">
      <details class="card adocs-expand adocs-expand-small component-property" id="cards[].media">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="cards[].media">cards[].media</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Media to display on the top/bottom of the card (must reference an Image, Audio or Video component</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="cards[].title">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="cards[].title">cards[].title</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Title of the card</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="cards[].description">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="cards[].description">cards[].description</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Full text displayed underneath the title, above any component children</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="cards[].footer">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="cards[].footer">cards[].footer</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string">Type: <span class="component-property-value">string</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Footer text of the card</div></div>
      </details>

      <details class="card adocs-expand adocs-expand-small component-property" id="cards[].children">
        <summary class="component-property-summary">
          <span class="component-property-chevron" aria-hidden="true"></span>
          <span class="component-property-name" title="cards[].children">cards[].children</span>
          <span class="component-property-summary-meta">
            <span class="component-property-required">Optional</span>
            <span class="component-property-type" title="string[]">Type: <span class="component-property-value">string[]</span></span>
          </span>
        </summary>
        <div class="a-collapseContent-inside component-property-details"><div class="component-property-description">Child component IDs to show inside the card</div></div>
      </details>
    </div>

  </div>
</details>
