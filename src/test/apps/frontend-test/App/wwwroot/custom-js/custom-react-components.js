/**
 * Registers React components for the CustomReact layout component, used by the Cypress tests in
 * test/e2e/integration/frontend-test/custom-react.ts (in src/App/frontend).
 *
 * This is written as plain JavaScript without a build step, so it uses React.createElement. A real app would usually
 * write the component in JSX/TSX and build it with 'react' and 'react/jsx-runtime' mapped to
 * window.altinnAppFrontend.React and window.altinnAppFrontend.jsxRuntime.
 */
(function () {
  function register(api) {
    var React = api.React;
    var h = React.createElement;

    function NameInput(props) {
      // Using a hook here verifies that the component runs on the same React instance as the app frontend
      var changes = React.useState(0);
      var value = props.formData.value == null ? '' : String(props.formData.value);

      if (props.summaryMode) {
        return h('p', { 'data-testid': 'custom-react-summary' }, props.texts.summaryPrefix + ': ' + value);
      }

      return h(
        'div',
        { 'data-testid': 'custom-react-input' },
        h('input', {
          id: props.id,
          type: 'text',
          value: value,
          placeholder: props.options.placeholder,
          readOnly: props.readOnly,
          'aria-label': props.texts.title,
          'aria-invalid': !props.isValid,
          onChange: function (event) {
            changes[1](changes[0] + 1);
            props.setValue('value', event.target.value);
          },
        }),
        h('p', null, props.texts.hint),
        h('p', { 'data-testid': 'custom-react-changes' }, 'Changes: ' + changes[0]),
        h('p', { 'data-testid': 'custom-react-language' }, 'Language: ' + props.language),
      );
    }

    api.registerComponent({ name: 'test-name-input', component: NameInput, apiVersion: 1 });
  }

  // The app frontend is normally loaded before this script. When it is loaded asynchronously (e.g. from the
  // development server), wait until it announces that the API is ready.
  if (window.altinnAppFrontend) {
    register(window.altinnAppFrontend);
  } else {
    window.addEventListener(
      'altinnAppFrontendReady',
      function (event) {
        register(event.detail);
      },
      { once: true },
    );
  }
})();
