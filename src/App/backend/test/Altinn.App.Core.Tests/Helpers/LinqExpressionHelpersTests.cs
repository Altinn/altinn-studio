using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class LinqExpressionHelpersTests
{
    public class MyModel
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("age")]
        public int? Age { get; set; }

        public List<MyModel>? Children { get; set; }
    }

    [Fact]
    public void GetJsonPath_OneLevelDeep()
    {
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, string?>(m => m.Name);
        propertyName.Should().Be("name");
    }

    [Fact]
    public void GetJsonPath_TwoLevelsDeep()
    {
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m => m.Children![0].Age);
        propertyName.Should().Be("Children[0].age");
    }

    [Fact()]
    public void GetJsonPath_TwoLevelsDeepUsingFirst()
    {
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, IEnumerable<int?>>(m =>
            m.Children!.Select(c => c.Age)
        );
        propertyName.Should().Be("Children.age");
    }

    [Fact]
    public void GetJsonPath_ManyLevelsDeep()
    {
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, IEnumerable<int?>>(m =>
            m.Children![0].Children![2].Children!.Select(c => c.Children![44].Age)
        );
        propertyName.Should().Be("Children[0].Children[2].Children.Children[44].age");
    }

    [Fact]
    public void GetJsonPath_IndexInVariable()
    {
        var index = 123;
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m => m.Children![index].Age);
        propertyName.Should().Be("Children[123].age");
    }

    [Fact]
    public void GetJsonPath_IndexInSelectStatement()
    {
        var i = 134;
        var list = new List<string> { "a", "b", "c" };
        foreach (var (id, j) in list.Select((id, j) => (id, j)))
        {
            var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m => m.Children![i].Children![j].Age);
            propertyName.Should().Be($"Children[{i}].Children[{j}].age");
        }
    }

    [Fact]
    public void GetJsonPath_IndexInVariableLoop()
    {
        for (var i = 0; i < 10; i++)
        {
            var index = i; // Needed to avoid "Access to modified closure" error
            var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m => m.Children![index].Age);
            propertyName.Should().Be($"Children[{index}].age");
        }
    }

    [Fact]
    public void GetJsonPath_AritmeticExpression()
    {
        var list = new List<string> { "one", "two" };
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m => m.Children![list.Count - 1].Age);
        propertyName.Should().Be("Children[1].age");
    }

    [Fact]
    public void GetJsonPath_AritmeticExpressionOnRecursiveModel()
    {
        var model = new MyModel
        {
            Children = new()
            {
                new() { Age = 3 },
                new() { Age = 4 },
            },
        };
        var propertyName = LinqExpressionHelpers.GetJsonPath<MyModel, int?>(m =>
            m.Children![model.Children.Count + 1].Age
        );
        propertyName.Should().Be("Children[3].age");
    }
}
