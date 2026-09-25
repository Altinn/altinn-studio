# Custom React components (`CustomReact`)

Apps can ship their own React components and use them in layouts with the `CustomReact` component type. The
component runs on the app frontend's own React instance, so hooks work and no second copy of React is loaded.

> **Status: beta.** The component type is not yet available in the Studio UI editor, and the Studio preview does
> not load app scripts, so the component shows an error there. Add it to layout files by hand.

## 1. Write the component

Copy [`types.ts`](./types.ts) into your component project, for example as `src/altinn-app-frontend.ts`, and add the
global declaration at the end:

```ts
declare global {
  interface Window {
    altinnAppFrontend?: AltinnAppFrontendApi;
  }
}
```

Then write the component and register it:

```tsx
// src/index.tsx
import { useState } from 'react';
import type { CustomReactComponentProps } from './altinn-app-frontend';

function MyCounter({ formData, setValue, texts, readOnly }: CustomReactComponentProps) {
  const [clicks, setClicks] = useState(0);
  const value = Number(formData.value ?? 0);

  return (
    <button
      disabled={readOnly}
      onClick={() => {
        setClicks(clicks + 1);
        setValue('value', value + 1);
      }}
    >
      {texts.buttonText}: {value} ({clicks})
    </button>
  );
}

window.altinnAppFrontend!.registerComponent({ name: 'my-counter', component: MyCounter, apiVersion: 1 });
```

Rules for registration:

- `name` must be lowercase words separated by hyphens, for example `my-counter`. Prefix it with your organization to
  avoid collisions, for example `digdir-counter`.
- Each name can only be registered once.
- `apiVersion` must match the version the app frontend provides (currently `1`). A mismatch throws an error in the
  browser console, instead of failing in unpredictable ways.

## 2. Build it with React as an external

Install `react`, `@types/react`, `vite` and `typescript` as dev dependencies. **Do not bundle React.** Map it to the
app frontend's copy instead:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      formats: ['iife'],
      name: 'myOrgComponents',
      fileName: () => 'my-org-components.js',
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', '@digdir/designsystemet-react'],
      output: {
        globals: {
          react: 'altinnAppFrontend.React',
          'react/jsx-runtime': 'altinnAppFrontend.jsxRuntime',
          '@digdir/designsystemet-react': 'altinnAppFrontend.Designsystemet',
        },
      },
    },
  },
});
```

Use `"jsx": "react-jsx"` in `tsconfig.json`. Run `vite build`, which produces `dist/my-org-components.js`.

If React is bundled by mistake, the component fails with an "Invalid hook call" error.

Only packages that the app frontend exposes on `window.altinnAppFrontend` can be external: `react`,
`react/jsx-runtime` and `@digdir/designsystemet-react`. Everything else must be bundled. Mapping another package to
a global that does not exist makes the script fail before it registers anything, so every component on the page
reports that it is not registered.

### Using Designsystemet

Import components from `@digdir/designsystemet-react` as usual. The mapping above makes the built script use the
app frontend's copy, so it is not bundled, and it shares React and React DOM with the page. Install the same version
as the app frontend (currently `1.21.0`) as a dev dependency, for the types. Do not import `@digdir/designsystemet-css`:
the app frontend already loads the styles, so the `ds-*` classes work too.

## 3. Add the script to the app

Copy the built file to `App/wwwroot/custom-js/` in the app. Every file in that folder is added to the app page
automatically, after the app frontend script. Restart the app after adding or removing files, because the file list
is read at startup.

This only works for apps that use the generated index page. Apps that still have `App/views/Home/Index.cshtml` must
add the `<script>` tag there themselves, after the app frontend script.

## 4. Use it in a layout

```json
{
  "id": "myCounter",
  "type": "CustomReact",
  "componentName": "my-counter",
  "required": true,
  "dataModelBindings": {
    "value": "Skjema.Antall"
  },
  "textResourceBindings": {
    "title": "counter.title",
    "buttonText": "counter.button"
  },
  "options": {
    "max": 10
  }
}
```

- **`dataModelBindings`** can have any keys. The component reads them from `formData` and writes with `setValue`,
  using the same keys.
- **`textResourceBindings`** can have any keys. The component gets them resolved to the current language in `texts`.
  `title`, `description` and `help` are also shown as the standard label above the component.
- **`options`** is passed unchanged to the component. Values are plain JSON and are not evaluated as expressions.
- **`readOnly`, `required` and `hidden`** work as for other form components, including expressions.

## Props

| Prop          | Description                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------- |
| `id`          | Unique id of this instance in the page. Includes the row index inside repeating groups.       |
| `formData`    | Current values of the data model bindings, keyed by binding name, as stored in the model.     |
| `setValue`    | `setValue(bindingKey, value)` writes a value to the data model field for a binding.           |
| `texts`       | All text resource bindings, resolved to the current language.                                 |
| `language`    | Current language code, for example `nb`, `nn` or `en`.                                        |
| `readOnly`    | True when the user must not change data. Always true in summary mode.                         |
| `required`    | True when the component is required.                                                          |
| `isValid`     | False when the component has visible validation errors. Use it to style the component.        |
| `summaryMode` | True when the component is rendered in a summary, and should present data instead of editing. |
| `options`     | The `options` object from the layout.                                                         |

## What the app frontend handles

- **Label and validation messages** are rendered around the component. The component only renders its own content.
- **Required validation** checks all data model bindings when `required` is true.
- **Summary and Summary2.** Summary shows the bound values joined by commas. Summary2 renders the component with
  `summaryMode` set to true.
- **PDF.** The PDF waits until the component is registered. If it is not registered within 10 seconds, the user sees
  an error, the reason is logged to the browser console, and the PDF is not generated.
- **Crashes.** An error thrown while rendering is caught, so it does not break the rest of the form.

## Scripts that may run before the app frontend

In deployed apps and with `studioctl run`, the app frontend always runs before scripts in `custom-js`. When the app
frontend is loaded from its development server (`studioctl run --dev-frontend`), it loads asynchronously. A script
that must work in both cases waits for the ready event:

```js
function register(api) {
  api.registerComponent({ name: 'my-counter', component: MyCounter, apiVersion: 1 });
}

if (window.altinnAppFrontend) {
  register(window.altinnAppFrontend);
} else {
  window.addEventListener('altinnAppFrontendReady', (event) => register(event.detail), { once: true });
}
```

The build recipe above reads `altinnAppFrontend.React` as soon as the script runs, so it does not support this case.
For development against the dev server, use a script written like
[`custom-react-components.js`](../../../../../test/apps/frontend-test/App/wwwroot/custom-js/custom-react-components.js)
in the frontend-test app.

## Compatibility

The props and `window.altinnAppFrontend` are a public contract, defined in [`types.ts`](./types.ts). Adding optional
props is not a breaking change. Removing or changing a prop, or a React major upgrade in the app frontend, bumps
`apiVersion`. Components built for the old version then fail to register with a clear error and must be rebuilt.
Minor and patch upgrades of Designsystemet in the app frontend reach app components without a rebuild.
