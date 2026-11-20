# App frontend layout components

Layout components are the building blocks that app developers place on the pages of their layouts, such as inputs,
dropdowns and buttons. Each component type has its own folder here. `yarn gen` treats every folder with a `config.ts`
as a component type, so nothing else registers one.

## What a component is made of

A component has three hand-written parts: `config.ts`, `index.tsx` and the React component. `yarn gen` writes the
rest from `config.ts`.

### `config.ts`

The one definition of what an app developer can configure: the component's properties, data model bindings, text
resource bindings and which properties take expressions. It also sets the component's category, its lifecycle and its
capabilities. The capabilities say which containers can show the component, such as Accordion, Tabs, Cards and tables.
Those containers check them in the app frontend.

### Generated files

`yarn gen` writes these from `config.ts`:

- In the component's folder:
  - `config.def.generated.ts`. It defines the component's abstract `Def` class, such as `InputDef`, which extends the
    base class in [LayoutComponent.tsx](LayoutComponent.tsx) for the component's category. The `Def` declares the
    methods that the configuration requires, such as a display value for a component with data model bindings.
  - `config.runtime.generated.ts`. It registers the component, so that the app frontend can look up its class and
    settings by its type.
- In [layout-contract](../../../../common/ts/layout-contract):
  - The layout schema, which app developers' editors and the app frontend read.
  - The component catalogue, which Designer reads.
  - A Markdown list of each component's properties per language, which docs.altinn.studio shows on the component's
    page, such as
    [Input](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/components/input/).

### `index.tsx`

The class here extends the `Def`, renders the React component and implements the methods the `Def` declares. It can
also override the defaults of its base class. When it lacks a method, for example after data model bindings are added
to `config.ts`, `yarn tsc` fails and names the missing method.

### The React component

The component that renders in the form, with its summaries and helpers. New rendering code goes in the shared
[form packages](../../../../common/ts/form-component/README.md).

## Lifecycle and Designer

The lifecycle in `config.ts` is `stable`, `beta` or `deprecated`. Mark a new component `beta` until an app version
that has it is released and Designer can configure it. Designer is released from `main`, but the app is released by
hand, so Designer sees the component in the catalogue first.

Designer leaves `beta` components out of its add-component panel. It offers a component only when it has a config in
Designer's [formItemConfig.ts](../../../../Designer/frontend/packages/ux-editor/src/data/formItemConfig.ts) and a place
in one of its panel lists. Designer's tests require both for every component that is not `beta`.

Designer's tests also need a label for each new text resource binding or data model binding name, even on a `beta`
component. The tests run on every pull request that changes the generated contract.

A component's page on docs.altinn.studio is added in [altinn-studio-docs](https://github.com/Altinn/altinn-studio-docs)
after the property list is on `main`. The docs build fetches the property lists from `main`, and fails when a page
names a component that has no property list.

## Outside the app frontend

- The app backend reads most components the same way, and treats every data model binding as a field in the data
  model. A component whose bindings are not plain fields, or that has its own rules for hidden data, has a class there,
  as [Adding a component class](../../../backend/src/Altinn.App.Core/Models/Layout/Components/_readme.md) describes.
- The fixed texts a component shows, such as its error messages, live in [language](../../../../common/ts/language).
- The [shared expression tests](../../../../common/expression-tests/README.md) cover the display value that the
  `displayValue` expression returns for each component type.
