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
    const title = document.createElement('h2');
    title.dataset.title = '';
    const caption = document.createElement('p');
    caption.dataset.caption = '';
    root.append(title, caption);

    for (const field of Object.keys(this._dataModelBindings)) {
      const label = document.createElement('label');
      label.textContent = field;
      const control = document.createElement(this.isEnabled('summarymode') ? 'output' : 'input');
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
      label.append(control);
      root.append(label);
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
