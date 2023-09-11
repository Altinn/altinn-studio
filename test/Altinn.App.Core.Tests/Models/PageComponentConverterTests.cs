#nullable enable

using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components;
using FluentAssertions;
using Xunit;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Models;

public class PageComponentConverterTests
{
    [Theory]
    [PageComponentConverterTest]
    public void RunPageComponentConverterTest(PageComponentConverterTestModel testCase)
    {
        var exception = Record.Exception(() => JsonSerializer.Deserialize<PageComponent>(testCase.Layout));

        if (testCase.Valid)
        {
            exception.Should().BeNull();
            if (testCase.ExpectedHierarchy is not null)
            {
                var page = JsonSerializer.Deserialize<PageComponent>(testCase.Layout)!;

                var hierarchy = GenerateTestHierarchy(page);
                hierarchy.Should().BeEquivalentTo(testCase.ExpectedHierarchy);
            }
        }
        else
        {
            exception.Should().NotBeNull();
        }
    }

    private HierarchyTestModel[] GenerateTestHierarchy(GroupComponent group)
    {
        var children = new List<HierarchyTestModel>();
        foreach (var child in group.Children)
        {
            if (child is GroupComponent childGroup)
            {
                children.Add(new HierarchyTestModel { Id = childGroup.Id, Children = GenerateTestHierarchy(childGroup) });
            }
            else
            {
                children.Add(new HierarchyTestModel { Id = child.Id });
            }
        }

        return children.ToArray();
    }
}

public class PageComponentConverterTestAttribute : DataAttribute
{
    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("Models", "page-component-converter-tests"));

        foreach (var file in files)
        {
            var data = File.ReadAllText(file);
            var testCase = JsonSerializer.Deserialize<PageComponentConverterTestModel>(data, new JsonSerializerOptions { ReadCommentHandling = JsonCommentHandling.Skip, PropertyNamingPolicy = JsonNamingPolicy.CamelCase })!;
            yield return new object[] { testCase };
        }
    }
}

public class PageComponentConverterTestModel
{
    public bool Valid { get; set; }

    public JsonElement Layout { get; set; }

    public HierarchyTestModel[]? ExpectedHierarchy { get; set; }

}

public class HierarchyTestModel
{
    public string Id { get; set; } = string.Empty;

    public HierarchyTestModel[]? Children { get; set; }
}
