## Working with layouts in C#

To represent layout components in Altinn Studio, we have defined a set of classes in the `Altinn.App.Core.Models.Layout.Components` namespace.
The main classes are:
* `LayoutModel`: This is the full class that stores all layouts for an application. You get it from `IAppResources`.
  * `GenerateComponentContexts` method generates a list of `ComponentContext` objects for all components in the layout. (note that these contexts are recursive)
* `LayoutSetComponent`: Has a collection of `PageComponent` and represents a layout set.
* `PageComponent`: Represents a page in the application and contains a collection of `BaseComponent`.
* `BaseComponent`: This is the base class for all layout components. It contains common properties such as `Id`, `Type`, `DataModelBindings`, and `TextResourceBindings`.

The `BaseComponent` class has several derived classes that represent specific types of components.
