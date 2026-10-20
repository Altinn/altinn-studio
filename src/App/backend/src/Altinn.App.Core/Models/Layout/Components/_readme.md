## Working with layouts in C#

To represent layout components in Altinn Studio, we have defined a set of classes in the `Altinn.App.Core.Models.Layout.Components` namespace.
The main classes are:
* `LayoutModel`: This is the full class that stores all layouts for an application. You get it from `IAppResources`.
  * `GenerateComponentContexts` method generates a list of `ComponentContext` objects for all components in the layout. (note that these contexts are recursive)
* `LayoutSetComponent`: Has a collection of `PageComponent` and represents a layout set.
* `PageComponent`: Represents a page in the application and contains a collection of `BaseComponent`.
* `BaseComponent`: This is the base class for all layout components. It contains common properties such as `Id`, `Type`, `DataModelBindings`, and `TextResourceBindings`.

The `BaseComponent` class has several derived classes that represent specific types of components.

## Adding a component class

Most component types are parsed as `UnknownComponent`, which treats every entry in `dataModelBindings` as a field in
the data model. Add a dedicated class when that assumption does not hold for a component, or when the component needs
its own logic for hidden data or contexts. `MapComponent` and `OptionsComponent` are the smallest examples.

### What to look at first

The frontend (`app-frontend-react`) is the source of truth for what a component reads and writes. The generated docs
often lack descriptions, so read `src/layout/<Component>/config.ts` for the bindings and properties, and the
component's hooks and validation code for how the bindings are used (which ones are fields, which ones are relative
paths, and what defaults apply when a binding is omitted).

### Data model bindings

* Only bindings that are fields in the data model take part in removal and protection of hidden data. Resolve them
  with `context.AddIndexes(binding)` so the row indexes of the surrounding repeating groups are added.
* Bindings that point to properties inside the objects of a list (eg. `geometries.data` for the Map component,
  `group.label` for options with a `group` binding) are not fields. They only make sense with a row index, and
  resolving them as fields fails at runtime. Report them once per row instead: get the row count from the form data
  wrapper, build the indexes with `RepeatingGroupComponent.GetSubRowIndexes`, and index the list and each row binding
  with `IFormDataWrapper.AddIndexToPath` (see `MapGeometriesBinding.AddRowReferences`). Reporting the rows matters
  even when the component itself only removes the whole list: a visible component must protect the rows it shows
  when another component bound to the same list (eg. a repeating group) is hidden.
* `AddIndexToPath` returns null for a path the data model does not have. Skip such references instead of failing,
  so default bindings for optional properties stay harmless.
* Give the bindings a component owns typed properties (`GroupModelBinding`, `SimpleBinding`, `GeometriesBinding`)
  instead of reading the `DataModelBindings` dictionary at evaluation time. Group related bindings in a record
  (`MapGeometriesBinding`) and resolve the same defaults the frontend uses, so consumers never have to know the
  fallback rules.
* Validate the bindings in `Parse` and throw `JsonException` with the `layoutId.pageId.id` of the component and the
  binding name. Reject binding names the component does not define.
* Presentation-only properties (map layers, zoom, toolbars, ...) are not parsed. List them in the class remarks so
  the omission is visible as a decision.

### Contexts and hidden data

* `GetContext` creates one `ComponentContext` per component. Only create child contexts when the component has rows
  that can be hidden individually (`RepeatingGroupComponent` with `hiddenRow`, `OptionsComponent` with a `checked`
  binding). Do not add row contexts just to index bindings.
* `GetDataReferencesToRemoveWhenHidden` returns the same references whether or not the component is hidden.
  `LayoutEvaluator` puts them in the hidden or the protected set based on `context.IsHidden`, and removes the
  difference. Removal happens in descending order, so rows are removed before the list they belong to.
* `hidden` and `removeWhenHidden` are evaluated once per context. Display flags stored in the data (eg. a geometry's
  `isHidden`) are not a reason to remove data.

### Checklist

1. Register the type in the `switch` in `PageComponent.Parse` (lower-case type name).
2. Make the class `public sealed` and extend `NoReferenceComponent` (no children) or `ReferenceComponent` (children).
3. Add tests under `test/Altinn.App.Core.Tests/LayoutExpressions/RemoveHiddenData/` using `MockedServiceCollection`
   and `LayoutEvaluator.GetHiddenFieldsForRemoval`, covering the component alone and together with a repeating group
   bound to the same list, plus the parse validation.
4. Run `PublicApiTests` to update the public API snapshot with the new types.
