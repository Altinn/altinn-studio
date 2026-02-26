using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;

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

        if (testCase.Valid)
        {
            var page = PageComponent.Parse(testCase.Layout, "testPage", "testLayout");
            if (testCase.ExpectedHierarchy is not null)
            {
                var hierarchy = GenerateTestHierarchy(page);
                hierarchy.Should().BeEquivalentTo(testCase.ExpectedHierarchy);
            }
        }
        else
        {
            var exception = Record.Exception(() => PageComponent.Parse(testCase.Layout, "testPage", "testLayout"));
            exception.Should().NotBeNull();
        }
    }

    private PageComponentConverterTestModel LoadData(string fileName, string folder)
    {
        var data = File.ReadAllText(Path.Join(folder, fileName));
        return JsonSerializer.Deserialize<PageComponentConverterTestModel>(data, _jsonSerializerOptions)!;
    }

    private List<HierarchyTestModel>? GenerateTestHierarchy(BaseComponent component)
    {
        var children = new List<HierarchyTestModel>();
        var childComponents =
            component switch
            {
                PageComponent page => page.ChildComponents,
                ReferenceComponent referenceComponent => referenceComponent.AllChildren,
                NoReferenceComponent => [],
                _ => throw new NotSupportedException(
                    $"Component type {component.GetType().Name} is not supported for hierarchy generation."
                ),
            } ?? throw new Exception("Component has no children.");
        foreach (var child in childComponents)
        {
            children.Add(new HierarchyTestModel { Id = child.Id, Children = GenerateTestHierarchy(child) });
        }

        return children.Count == 0 ? null : children;
    }
}

public class PageComponentConverterTestModel
{
    public bool Valid { get; set; }

    public JsonElement Layout { get; set; }

    public List<HierarchyTestModel>? ExpectedHierarchy { get; set; }
}

public class HierarchyTestModel
{
    public string Id { get; set; } = string.Empty;

    public List<HierarchyTestModel>? Children { get; set; }
}
