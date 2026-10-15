using System.Collections;
using System.Collections.Immutable;
using System.Collections.ObjectModel;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Models.Layout;

/// <summary>
/// A parsed layout is shared between requests, so nothing in it may change after parsing.
/// </summary>
public class LayoutImmutabilityTests
{
    private const string LayoutNamespace = "Altinn.App.Core.Models.Layout";

    private static readonly Type[] _otherSharedTypes =
    [
        typeof(Expression),
        typeof(ExpressionValue),
        typeof(ModelBinding),
    ];

    /// <summary>
    /// A layout with every component type, including a repeating group with rows before and after.
    /// </summary>
    private const string AllComponentTypesLayout = """
        {
          "data": {
            "layout": [
              { "id": "group", "type": "Group", "children": ["groupChild"] },
              { "id": "groupChild", "type": "Input", "dataModelBindings": { "simpleBinding": "name" } },
              {
                "id": "repeating",
                "type": "RepeatingGroup",
                "dataModelBindings": { "group": "rows" },
                "children": ["rowInput"],
                "rowsBefore": [{ "cells": [{ "component": "beforeText" }, { "text": "header" }] }],
                "rowsAfter": [{ "cells": [{ "component": "afterText" }] }],
                "hiddenRow": ["equals", ["dataModel", "rows.hide"], true],
                "textResourceBindings": { "title": "repeating.title" }
              },
              { "id": "rowInput", "type": "Input", "dataModelBindings": { "simpleBinding": "rows.value" } },
              { "id": "beforeText", "type": "Paragraph" },
              { "id": "afterText", "type": "Paragraph" },
              { "id": "grid", "type": "Grid", "rows": [{ "cells": [{ "component": "gridChild" }, null] }] },
              { "id": "gridChild", "type": "Input" },
              { "id": "tabs", "type": "Tabs", "tabs": [{ "id": "tab1", "children": ["tabChild"] }, { "id": "tab2" }] },
              { "id": "tabChild", "type": "Paragraph" },
              { "id": "cards", "type": "Cards", "cards": [{ "children": ["cardChild"] }] },
              { "id": "cardChild", "type": "Paragraph" },
              { "id": "accordion", "type": "Accordion", "children": ["accordionChild"] },
              { "id": "accordionChild", "type": "Paragraph" },
              { "id": "likert", "type": "Likert", "dataModelBindings": { "questions": "rows", "simpleBinding": "rows.value" } },
              {
                "id": "checkboxes",
                "type": "Checkboxes",
                "dataModelBindings": { "simpleBinding": "name" },
                "options": [{ "value": "a", "label": "A" }]
              },
              { "id": "subform", "type": "Subform", "layoutSet": "subformLayout" }
            ]
          }
        }
        """;

    public static TheoryData<Type> SharedTypes() => new(GetSharedTypes());

    private static IEnumerable<Type> GetSharedTypes() =>
        typeof(PageComponent)
            .Assembly.GetTypes()
            .Where(t =>
                t.Namespace is { } ns
                && (ns == LayoutNamespace || ns.StartsWith(LayoutNamespace + ".", StringComparison.Ordinal))
            )
            .Concat(_otherSharedTypes)
            .Where(t => !t.IsEnum && !t.IsInterface && t.GetCustomAttribute<CompilerGeneratedAttribute>() is null);

    [Theory]
    [MemberData(nameof(SharedTypes))]
    public void SharedType_HasNoMutableMembers(Type type)
    {
        const BindingFlags Declared =
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

        foreach (var property in type.GetProperties(Declared))
        {
            if (property.SetMethod is { } setter)
            {
                var isInit = setter.ReturnParameter.GetRequiredCustomModifiers().Contains(typeof(IsExternalInit));
                Assert.True(isInit, $"{type.Name}.{property.Name} has a setter that is not init-only");
            }

            Assert.False(
                IsMutableCollection(property.PropertyType),
                $"{type.Name}.{property.Name} is a mutable collection type"
            );
        }

        foreach (var field in type.GetFields(Declared))
        {
            Assert.True(field.IsInitOnly, $"{type.Name}.{field.Name} is a field that is not readonly");
        }
    }

    [Fact]
    public void ComponentTypes_CannotBeSubclassedOutsideCore()
    {
        foreach (
            var type in GetSharedTypes().Where(t => t.IsSubclassOf(typeof(BaseComponent)) || t == typeof(BaseComponent))
        )
        {
            if (type.IsAbstract)
            {
                var constructors = type.GetConstructors(
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic
                );
                Assert.All(
                    constructors,
                    c =>
                        Assert.True(
                            c.IsFamilyAndAssembly,
                            $"{type.Name} has a constructor that is not private protected"
                        )
                );
            }
            else
            {
                Assert.True(type.IsSealed, $"{type.Name} is not sealed");
            }
        }
    }

    [Fact]
    public void ParsedLayout_CollectionsAreImmutable()
    {
        var page = ParsePage();
        var components = page.AllComponents.Append(page).ToList();
        components.AddRange(page.AllComponents.OfType<RepeatingGroupComponent>().Select(g => g.RowComponent));

        foreach (var component in components)
        {
            AssertCollectionsImmutable(component, component.Id);
        }
    }

    [Fact]
    public void ParsedLayout_ChildrenAreBuiltComponents()
    {
        var page = ParsePage();

        Assert.Equal(
            ["group", "repeating", "grid", "tabs", "cards", "accordion", "likert", "checkboxes", "subform"],
            page.ChildComponents.Select(c => c.Id)
        );
        var repeating = page.AllComponents.OfType<RepeatingGroupComponent>().Single();
        Assert.Equal(["beforeText"], repeating.BeforeChildren.Select(c => c.Id));
        Assert.Equal(["rowInput"], repeating.RepeatingChildren.Select(c => c.Id));
        Assert.Equal(["afterText"], repeating.AfterChildren.Select(c => c.Id));
        Assert.Equal(["beforeText", "rowInput", "afterText"], repeating.Children.Select(c => c.Id));
        Assert.Equal("repeating__group_row", repeating.RowComponent.Id);
        Assert.Same(page.AllComponents.Single(c => c.Id == "rowInput"), repeating.RepeatingChildren[0]);
    }

    [Fact]
    public void LiteralExpression_ArgsThrows()
    {
        Assert.True(Expression.False.IsLiteralValue);
        Assert.Throws<InvalidOperationException>(() => Expression.False.Args);

        var function = new Expression(ExpressionFunction.not, Expression.False);
        Assert.False(function.IsLiteralValue);
        Assert.Single(function.Args);
    }

    [Fact]
    public void UiFolder_KeepsItsOwnCopyOfThePages()
    {
        var pages = new List<PageComponent> { ParsePage() };
        var folder = new UiFolderComponent(pages, "layout", "default");

        pages.Clear();

        Assert.IsType<ImmutableArray<PageComponent>>(folder.Pages);
        Assert.Single(folder.Pages);
    }

    [Fact]
    public async Task SharedLayout_ConcurrentContextGeneration_MatchesSequential()
    {
        using var subformDocument = JsonDocument.Parse("""{ "data": { "layout": [] } }""");
        var subformPage = PageComponent.Parse(subformDocument.RootElement, "subformPage", "subformLayout");
        var layoutModel = new LayoutModel(
            [
                new UiFolderComponent([ParsePage()], "layout", "default"),
                new UiFolderComponent([subformPage], "subformLayout", "subformData"),
            ],
            "layout"
        );

        var expected = Describe(await layoutModel.GenerateComponentContexts(CreateDataAccessor(layoutModel)));

        var results = await Task.WhenAll(
            Enumerable
                .Range(0, 32)
                .Select(_ =>
                    Task.Run(async () =>
                        Describe(await layoutModel.GenerateComponentContexts(CreateDataAccessor(layoutModel)))
                    )
                )
        );

        Assert.Contains(expected, line => line.Trim() == "repeating__group_row[2]");
        Assert.All(results, result => Assert.Equal(expected, result));
    }

    private static PageComponent ParsePage()
    {
        using var document = JsonDocument.Parse(AllComponentTypesLayout);
        return PageComponent.Parse(document.RootElement, "page", "layout");
    }

    private static InstanceDataAccessorFake CreateDataAccessor(LayoutModel layoutModel)
    {
        using var document = JsonDocument.Parse(
            """{ "name": "x", "rows": [{ "value": "a", "hide": false }, { "value": "b", "hide": true }, { "value": "c", "hide": false }] }"""
        );
        var instance = new Instance
        {
            Id = "1337/12345678-1234-1234-1234-123456789012",
            AppId = "ttd/test",
            Data = [],
        };
        return new InstanceDataAccessorFake(instance, null, null, layoutModel, null, null, null)
        {
            {
                new DataElement { Id = "12345678-1234-1234-1234-123456789013", DataType = "default" },
                DynamicClassBuilder.DataObjectFromJsonDocument(document.RootElement)
            },
        };
    }

    private static List<string> Describe(IEnumerable<ComponentContext> contexts)
    {
        var result = new List<string>();
        foreach (var context in contexts)
        {
            var rows = context.RowIndices is { } indexes ? $"[{string.Join(',', indexes)}]" : "";
            result.Add($"{context.Component?.Id}{rows}");
            result.AddRange(Describe(context.ChildContexts).Select(child => "  " + child));
        }
        return result;
    }

    private static bool IsMutableCollection(Type type)
    {
        if (type.IsArray)
        {
            return true;
        }
        if (!type.IsGenericType)
        {
            return false;
        }
        var definition = type.GetGenericTypeDefinition();
        return definition == typeof(List<>)
            || definition == typeof(Dictionary<,>)
            || definition == typeof(HashSet<>)
            || definition == typeof(IList<>)
            || definition == typeof(ICollection<>)
            || definition == typeof(IDictionary<,>);
    }

    private static void AssertCollectionsImmutable(object value, string path)
    {
        foreach (var property in value.GetType().GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            if (property.GetIndexParameters().Length > 0)
            {
                continue;
            }
            var propertyValue = property.GetValue(value);
            if (propertyValue is null or string || propertyValue is not IEnumerable collection)
            {
                continue;
            }

            var propertyPath = $"{path}.{property.Name}";
            var type = propertyValue.GetType();
            var isImmutable =
                type.IsGenericType
                && (
                    type.GetGenericTypeDefinition() == typeof(ImmutableArray<>)
                    || type.GetGenericTypeDefinition() == typeof(ReadOnlyDictionary<,>)
                    || type.GetGenericTypeDefinition() == typeof(ImmutableDictionary<,>)
                );
            Assert.True(isImmutable, $"{propertyPath} is a {type.Name}");

            // Child components are checked on their own; config objects are checked here
            foreach (var item in collection)
            {
                if (
                    item is not null and not BaseComponent
                    && !item.GetType().IsPrimitive
                    && item is not string
                    && !item.GetType().IsValueType
                )
                {
                    AssertCollectionsImmutable(item, propertyPath + "[]");
                }
            }
        }
    }
}
