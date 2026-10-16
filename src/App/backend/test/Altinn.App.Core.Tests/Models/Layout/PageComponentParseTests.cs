using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Tests.Models.Layout;

public class PageComponentParseTests
{
    private static PageComponent Parse(string components)
    {
        using var document = JsonDocument.Parse($$"""{ "data": { "layout": [{{components}}] } }""");
        return PageComponent.Parse(document.RootElement, "page", "layout");
    }

    private static JsonException ParseError(string components) => Assert.Throws<JsonException>(() => Parse(components));

    [Fact]
    public void NestedContainers_DeclaredBeforeOrAfterTheirChildren_AreBuilt()
    {
        var page = Parse(
            """
            { "id": "leaf", "type": "Input" },
            { "id": "outer", "type": "Group", "children": ["middle"] },
            { "id": "middle", "type": "Group", "children": ["inner"] },
            { "id": "inner", "type": "Group", "children": ["leaf"] }
            """
        );

        var outer = Assert.IsType<NonRepeatingGroupComponent>(Assert.Single(page.ChildComponents));
        var middle = Assert.IsType<NonRepeatingGroupComponent>(Assert.Single(outer.Children));
        var inner = Assert.IsType<NonRepeatingGroupComponent>(Assert.Single(middle.Children));
        Assert.Equal("leaf", Assert.Single(inner.Children).Id);
        Assert.Equal(["leaf", "outer", "middle", "inner"], page.AllComponents.Select(c => c.Id));
        Assert.Same(page.AllComponents[0], inner.Children[0]);
    }

    [Fact]
    public void MissingChild_Throws_WithLocation()
    {
        var error = ParseError("""{ "id": "group", "type": "Group", "children": ["missing"] }""");

        Assert.Equal("$.data.layout[0]", error.Path);
        Assert.Contains("Component \"group\" at $.data.layout[0] on page \"page\" in layout \"layout\"", error.Message);
        Assert.Contains("\"missing\"", error.Message);
        Assert.Contains("does not exist", error.Message);
    }

    [Fact]
    public void ChildClaimedByTwoParents_Throws()
    {
        var error = ParseError(
            """
            { "id": "child", "type": "Input" },
            { "id": "first", "type": "Group", "children": ["child"] },
            { "id": "second", "type": "Group", "children": ["child"] }
            """
        );

        Assert.Equal("$.data.layout[2]", error.Path);
        Assert.Contains("already been claimed by \"first\"", error.Message);
    }

    [Fact]
    public void ChildClaimedTwiceByOneParent_Throws()
    {
        var error = ParseError(
            """
            { "id": "child", "type": "Input" },
            { "id": "group", "type": "Group", "children": ["child", "child"] }
            """
        );

        Assert.Contains("claimed twice by group", error.Message);
    }

    [Fact]
    public void ComponentContainingItself_Throws()
    {
        var error = ParseError("""{ "id": "group", "type": "Group", "children": ["group"] }""");

        Assert.Contains("contains itself", error.Message);
    }

    [Fact]
    public void ContainersContainingEachOther_Throw()
    {
        var error = ParseError(
            """
            { "id": "a", "type": "Group", "children": ["b"] },
            { "id": "b", "type": "Group", "children": ["a"] }
            """
        );

        Assert.Contains("contains itself", error.Message);
    }

    [Fact]
    public void DuplicateId_Throws()
    {
        var error = ParseError(
            """
            { "id": "same", "type": "Input" },
            { "id": "same", "type": "Paragraph" }
            """
        );

        Assert.Contains("Duplicate component id 'same' on page 'page' in layout 'layout'", error.Message);
    }

    [Fact]
    public void InvalidComponent_Throws_WithLocationAndInnerException()
    {
        var error = ParseError(
            """
            { "id": "ok", "type": "Input" },
            { "id": "grid", "type": "Grid" }
            """
        );

        Assert.Equal("$.data.layout[1]", error.Path);
        Assert.Contains("Component \"grid\" at $.data.layout[1]", error.Message);
        Assert.Contains("must have a \"rows\" property", error.Message);
        Assert.IsType<JsonException>(error.InnerException);
    }

    [Fact]
    public void ComponentWithoutId_Throws_WithIndex()
    {
        var error = ParseError("""{ "type": "Input" }""");

        Assert.Equal("$.data.layout[0]", error.Path);
        Assert.Contains("Component at $.data.layout[0]", error.Message);
    }

    [Fact]
    public void Create_FindsTopLevelComponents()
    {
        var child = Leaf("child");
        var group = Group("group", child);
        var other = Leaf("other");

        var page = PageComponent.Create("page", "layout", Expression.False, [child, group, other]);

        Assert.Equal(["group", "other"], page.ChildComponents.Select(c => c.Id));
        Assert.Equal(["child", "group", "other"], page.AllComponents.Select(c => c.Id));
    }

    [Fact]
    public void Create_ChildWithTwoParents_Throws()
    {
        var child = Leaf("child");

        var error = Assert.Throws<ArgumentException>(() =>
            PageComponent.Create("page", "layout", Expression.False, [child, Group("a", child), Group("b", child)])
        );

        Assert.Contains("has two parents", error.Message);
    }

    private static UnknownComponent Leaf(string id) =>
        new()
        {
            Id = id,
            PageId = "page",
            LayoutId = "layout",
            Type = "Input",
            Hidden = Expression.False,
            RemoveWhenHidden = Expression.False,
            Required = Expression.False,
            ReadOnly = Expression.False,
            DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
            TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
        };

    private static NonRepeatingGroupComponent Group(string id, params BaseLayoutComponent[] children) =>
        new()
        {
            Id = id,
            PageId = "page",
            LayoutId = "layout",
            Type = "Group",
            Hidden = Expression.False,
            RemoveWhenHidden = Expression.False,
            Required = Expression.False,
            ReadOnly = Expression.False,
            DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
            TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
            Children = [.. children],
        };
}
