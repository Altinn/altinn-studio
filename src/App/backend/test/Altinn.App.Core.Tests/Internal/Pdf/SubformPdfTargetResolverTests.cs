using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class SubformPdfTargetResolverTests
{
    private static Mock<IAppResources> Resources(string firstFolder, string? secondFolder = null)
    {
        var resources = new Mock<IAppResources>();
        resources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new()
                    {
                        ["Task_1"] = new(),
                        ["Task_2"] = new(),
                        ["Cars"] = new() { DefaultDataType = "Car" },
                        ["OtherCars"] = new() { DefaultDataType = "Car" },
                        ["People"] = new() { DefaultDataType = "Person" },
                    },
                }
            );
        resources.Setup(x => x.GetLayoutsInFolder(It.IsAny<string>())).Returns("{}");
        resources.Setup(x => x.GetLayoutsInFolder("Task_1")).Returns(SubformLayout(firstFolder));
        if (secondFolder is not null)
        {
            resources.Setup(x => x.GetLayoutsInFolder("Task_2")).Returns(SubformLayout(secondFolder));
        }
        return resources;
    }

    [Fact]
    public void Resolve_SeveralTasksReferenceSameFolder_ReturnsSubformFolderIdentity()
    {
        var resources = Resources("Cars", "Cars");
        var resolver = new SubformPdfTargetResolver(resources.Object);
        var element = new DataElement { Id = "element-1", DataType = "Car" };

        SubformPdfRenderTarget target = resolver.Resolve("items", element);

        Assert.Equal(new SubformPdfRenderTarget("Cars", "Car", "element-1"), target);
    }

    [Fact]
    public void Resolve_SameComponentIdWithDifferentDataTypes_UsesRequestedDataType()
    {
        var resources = Resources("People", "Cars");
        var resolver = new SubformPdfTargetResolver(resources.Object);

        SubformPdfRenderTarget target = resolver.Resolve("items", new DataElement { Id = "car-1", DataType = "Car" });

        Assert.Equal("Cars", target.UiFolder);
        Assert.Equal("Car", target.DataType);
    }

    [Fact]
    public void Resolve_DistinctFoldersMatchComponentAndDataType_RejectsAmbiguousTarget()
    {
        var resources = Resources("Cars", "OtherCars");
        var resolver = new SubformPdfTargetResolver(resources.Object);

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            resolver.Resolve("items", new DataElement { Id = "car-1", DataType = "Car" })
        );

        Assert.Contains("Cars", exception.Message);
        Assert.Contains("OtherCars", exception.Message);
        Assert.Contains("items", exception.Message);
    }

    [Theory]
    [InlineData("Missing")]
    [InlineData("People")]
    public void Resolve_ComponentDoesNotReferenceRequestedDataType_RejectsTarget(string subformFolder)
    {
        var resources = Resources(subformFolder);
        var resolver = new SubformPdfTargetResolver(resources.Object);

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            resolver.Resolve("items", new DataElement { Id = "car-1", DataType = "Car" })
        );

        Assert.Contains("items", exception.Message);
        Assert.Contains("Car", exception.Message);
    }

    [Fact]
    public void Resolve_MissingComponent_RejectsTarget()
    {
        var resolver = new SubformPdfTargetResolver(Resources("Cars").Object);

        Assert.Throws<ApplicationConfigException>(() =>
            resolver.Resolve("missing", new DataElement { Id = "car-1", DataType = "Car" })
        );
    }

    [Fact]
    public void Resolve_ReusesIndexWithinScope_RefreshesForNewResolver()
    {
        var resources = Resources("Cars");
        var resolver = new SubformPdfTargetResolver(resources.Object);
        var element = new DataElement { Id = "car-1", DataType = "Car" };
        Assert.Equal("Cars", resolver.Resolve("items", element).UiFolder);
        resources.Setup(x => x.GetLayoutsInFolder("Task_1")).Returns(SubformLayout("OtherCars"));

        Assert.Equal("Cars", resolver.Resolve("items", element).UiFolder);
        Assert.Equal("OtherCars", new SubformPdfTargetResolver(resources.Object).Resolve("items", element).UiFolder);

        resources.Verify(x => x.GetUiConfiguration(), Times.Exactly(2));
        resources.Verify(x => x.GetLayoutsInFolder("Task_1"), Times.Exactly(2));
    }

    // The Subform is a child claimed by a Group. Use the typed page's complete component list so it
    // remains discoverable even when it is not a top-level component in the parsed hierarchy.
    private static string SubformLayout(string subformFolder) =>
        JsonSerializer.Serialize(
            new
            {
                Page = new
                {
                    data = new
                    {
                        layout = new object[]
                        {
                            new
                            {
                                id = "group",
                                type = "Group",
                                children = new[] { "items" },
                            },
                            new
                            {
                                id = "items",
                                type = "Subform",
                                layoutSet = subformFolder,
                            },
                        },
                    },
                },
            }
        );
}
