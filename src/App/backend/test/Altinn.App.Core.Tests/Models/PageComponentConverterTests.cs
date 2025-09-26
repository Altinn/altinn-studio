using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Models;

public class PageComponentConverterTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [Theory]
    [FileNamesInFolderData("Models/page-component-converter-tests")]
    public void RunPageComponentConverterTest(string fileName, string folder)
    {
        var testCase = LoadData(fileName, folder);
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

    private PageComponentConverterTestModel LoadData(string fileName, string folder)
    {
        var data = File.ReadAllText(Path.Join(folder, fileName));
        return JsonSerializer.Deserialize<PageComponentConverterTestModel>(data, _jsonSerializerOptions)!;
    }

    private HierarchyTestModel[] GenerateTestHierarchy(GroupComponent group)
    {
        var children = new List<HierarchyTestModel>();
        foreach (var child in group.Children)
        {
            if (child is GroupComponent childGroup)
            {
                children.Add(
                    new HierarchyTestModel { Id = childGroup.Id, Children = GenerateTestHierarchy(childGroup) }
                );
            }
            else
            {
                children.Add(new HierarchyTestModel { Id = child.Id });
            }
        }

        return children.ToArray();
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
