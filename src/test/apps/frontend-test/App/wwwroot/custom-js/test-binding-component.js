// Plain web component exercising the public Custom layout component contract.
class TestBindingComponent extends HTMLElement {
  static observedAttributes = ['text', 'readonly', 'required', 'summarymode'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._formData = {};
    this._texts = {};
    this._dataModelBindings = {};
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  set formData(value) {
    this._formData = value ?? {};
    this.updateValues();
  }

  get formData() {
    return this._formData;
  }

  set texts(value) {
    this._texts = value ?? {};
    this.updateTexts();
  }

  get texts() {
    return this._texts;
  }

  set dataModelBindings(value) {
    this._dataModelBindings = value ?? {};
    this.render();
  }

  get dataModelBindings() {
    return this._dataModelBindings;
  }

  isEnabled(attribute) {
    return this.hasAttribute(attribute) && this.getAttribute(attribute) !== 'false';
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren();
    const summaryMode = this.isEnabled('summarymode');
    let content = root;
    if (summaryMode) {
      const style = document.createElement('style');
      style.textContent = `
        .summary {
          padding: 24px;
          border: 2px solid #0062ba;
          border-left-width: 8px;
          border-radius: 12px;
          background: #e8f4fd;
          color: #003b5c;
        }
        .summary h2 { margin: 0; }
        .summary-heading { margin: 0 0 12px; font-weight: bold; }
        .summary dl { margin: 24px 0 0; }
        .summary dl > div {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px 24px;
          padding: 12px 0;
          border-top: 1px solid #0062ba;
        }
        .summary dt { font-weight: bold; }
        .summary dd { margin: 0; overflow-wrap: anywhere; }
      `;
      content = document.createElement('section');
      content.className = 'summary';
      content.dataset.summary = '';
      const heading = document.createElement('p');
      heading.className = 'summary-heading';
      heading.dataset.summaryHeading = '';
      heading.textContent = 'Custom summary';
      content.append(heading);
      root.append(style, content);
    }
    const title = document.createElement('h2');
    title.dataset.title = '';
    const caption = document.createElement('p');
    caption.dataset.caption = '';
    content.append(title, caption);

    const values = summaryMode ? document.createElement('dl') : content;
    if (summaryMode) content.append(values);

    for (const field of Object.keys(this._dataModelBindings)) {
      const label = document.createElement(summaryMode ? 'dt' : 'label');
      label.textContent = field;
      const control = document.createElement(summaryMode ? 'output' : 'input');
      control.dataset.field = field;
      if (control instanceof HTMLInputElement) {
        control.readOnly = this.isEnabled('readonly');
        control.required = this.isEnabled('required');
        control.addEventListener('input', () => {
          // Omitting field must still work for simpleBinding. Other names must be forwarded verbatim.
          const detail =
            field === 'simpleBinding' ? { value: control.value } : { field, value: control.value };
          this.dispatchEvent(
            new CustomEvent('dataChanged', { detail, bubbles: true, composed: true }),
          );
        });
      }
      if (summaryMode) {
        const row = document.createElement('div');
        const value = document.createElement('dd');
        value.append(control);
        row.append(label, value);
        values.append(row);
      } else {
        label.append(control);
        values.append(label);
      }
    }
    this.updateTexts();
    this.updateValues();
  }

  updateTexts() {
    const title = this.shadowRoot.querySelector('[data-title]');
    const caption = this.shadowRoot.querySelector('[data-caption]');
    if (title) title.textContent = this.getAttribute('text') ?? '';
    if (caption) caption.textContent = this._texts.galaxyCaption ?? '';
  }

  updateValues() {
    for (const control of this.shadowRoot.querySelectorAll('[data-field]')) {
      const value = this._formData[control.dataset.field] ?? '';
      if (control instanceof HTMLInputElement) {
        control.value = value;
      } else {
        control.textContent = value;
      }
    }
  }
}

customElements.define('test-binding-component', TestBindingComponent);
