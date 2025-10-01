Most components are handled in C# with the generic `Altinn.App.Core.Models.Layout.Components.BaseComponent`
that includes the most common fields in components. Some component types have other fields that have meaning in backend
(or is used in backend validation) thus a subclass of `BaseComponent` is used.