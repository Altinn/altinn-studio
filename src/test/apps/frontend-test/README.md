App used for Cypress testing.

The optional `custom-components` page in Task_2 exercises the `Custom` layout type.
Enable it with "Egendefinerte komponenter" under "Vis ekstra sider" on the form page.
`App/wwwroot/custom-js/test-binding-component.js` registers a plain web component,
loaded by the app backend. It renders inputs in a shadow root, receives the
`formData`, `dataModelBindings`, and `texts` properties, and emits `dataChanged`.
In summary mode it renders outputs instead of inputs.

The `custom-components.ts` Cypress spec checks bindings in both directions,
persistence, translations, legacy summaries, Summary2, and component visibility.
