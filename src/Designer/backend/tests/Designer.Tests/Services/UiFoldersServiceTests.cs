using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class UiFoldersServiceTests : IDisposable
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string Repo = "app-with-ui-folders";
    private const string OrderedRepo = "app-with-ordered-ui-folders";
    private const string SubformPdfRepo = "app-with-subform-pdf-v9";
    private const string DataTask = "Task_1";
    private const string TaskWithoutPages = "PdfWithoutPages";
    private const string TaskWithStaleCopy = "PdfWithStaleCopy";
    private const string TaskWithCopy = "PdfWithCopy";
    private const string ServiceTaskLayout = "ServiceTask";
    private string _testRepoPath;

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsLayoutSetMatchingTaskId()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        Assert.Equal("Task_1", result.First().Id);
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ExcludesFolderWithoutMatchingTask()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

        // Assert
        Assert.DoesNotContain(result, dto => dto.Id == "orphanFolder");
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsCorrectDataTypeAndPageCount()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );
        UiFolderLayoutSetDto layoutSet = result.Single(dto => dto.Id == "Task_1");

        // Assert
        Assert.Equal("myModel", layoutSet.DataType);
        Assert.Equal(2, layoutSet.PageCount);
    }

    [Fact]
    public async Task GetLayoutSetsExtended_OrdersByProcessFlowAndPlacesSubformsLast()
    {
        // The BPMN lists Task_1 before Task_2, but the flow reaches Task_2 first. The subform has no task
        // and must come last.
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(OrderedRepo);

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

        // Assert
        Assert.Equal(["Task_2", "Task_1", "PdfTask", "subformSet"], result.Select(dto => dto.Id));
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsLayoutSetOfPdfServiceTask()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(OrderedRepo);

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );
        UiFolderLayoutSetDto pdfLayoutSet = result.Single(dto => dto.Id == "PdfTask");

        // Assert
        Assert.Equal("pdf", pdfLayoutSet.TaskType);
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetIsMissing_CreatesItWithHiddenCopy()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);

        IEnumerable<SubformComponentDto> subformComponents = await service.SaveSubformPdfComponent(
            editingContext,
            TaskWithoutPages,
            "vehicles",
            DataTask,
            null,
            CancellationToken.None
        );

        JsonNode settings = JsonNode.Parse(ReadFile(SettingsPath(TaskWithoutPages)));
        Assert.Equal("model", (string)settings["defaultDataType"]);
        Assert.Equal([ServiceTaskLayout], settings["pages"]["order"].AsArray().Select(page => (string)page));

        JsonArray components = ReadComponents(TaskWithoutPages, ServiceTaskLayout);
        Assert.Contains(components, component => (string)component["id"] == "service-task-waiting-title");
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));

        SubformComponentDto copy = Assert.Single(
            subformComponents,
            component => component.LayoutSetId == TaskWithoutPages
        );
        Assert.Equal("vehicles", copy.ComponentId);
        Assert.Equal("subformPdf", copy.TaskType);
        Assert.Equal("vehicle", copy.SubformDataTypeId);
    }

    [Fact]
    public async Task SaveSubformPdfComponent_PreservesOtherSubformComponents()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string waitingPageBefore = ReadFile(LayoutPath(TaskWithStaleCopy, ServiceTaskLayout));

        await service.SaveSubformPdfComponent(
            editingContext,
            TaskWithStaleCopy,
            "vehicles",
            DataTask,
            null,
            CancellationToken.None
        );

        JsonArray components = ReadComponents(TaskWithStaleCopy, "Copies");
        Assert.Equal(
            ["notes", "copies-description", "vehicles"],
            components.Select(component => (string)component["id"])
        );
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));
        Assert.Equal(waitingPageBefore, ReadFile(LayoutPath(TaskWithStaleCopy, ServiceTaskLayout)));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenSelectionChanges_ReplacesPreviousCopy()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        JsonArray sourceComponents = ReadComponents(DataTask, "Overview");
        JsonObject secondComponent = VehiclesCopy();
        secondComponent["id"] = "other-vehicles";
        secondComponent.Remove("hidden");
        sourceComponents.Add(secondComponent);
        WriteComponents(DataTask, "Overview", sourceComponents);

        string previousComponentId = "vehicles";
        foreach (string componentId in new[] { "other-vehicles", "vehicles", "other-vehicles" })
        {
            await service.SaveSubformPdfComponent(
                editingContext,
                TaskWithCopy,
                componentId,
                DataTask,
                previousComponentId,
                CancellationToken.None
            );

            JsonNode copy = Assert.Single(
                ReadComponents(TaskWithCopy, ServiceTaskLayout),
                component => (string)component["type"] == "Subform"
            );
            Assert.Equal(componentId, (string)copy["id"]);
            Assert.True((bool)copy["hidden"]);
            previousComponentId = componentId;
        }
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task SaveSubformPdfComponent_WhenPreviousCopyIsMissingOrDuplicated_KeepsOneSelectedCopy(
        int previousCopyCount
    )
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        JsonArray waitingComponents = ReadComponents(TaskWithStaleCopy, ServiceTaskLayout);
        JsonArray copyComponents = ReadComponents(TaskWithStaleCopy, "Copies");
        for (int i = 0; i < previousCopyCount; i++)
        {
            JsonObject previousCopy = VehiclesCopy();
            previousCopy["id"] = "previous-vehicles";
            (i == 0 ? waitingComponents : copyComponents).Add(previousCopy);
        }
        waitingComponents.Add(VehiclesCopy());
        WriteComponents(TaskWithStaleCopy, ServiceTaskLayout, waitingComponents);
        WriteComponents(TaskWithStaleCopy, "Copies", copyComponents);
        JsonNode unrelatedCopy = copyComponents.Single(component => (string)component["id"] == "notes").DeepClone();

        await service.SaveSubformPdfComponent(
            editingContext,
            TaskWithStaleCopy,
            "vehicles",
            DataTask,
            "previous-vehicles",
            CancellationToken.None
        );

        JsonNode[] components =
        [
            .. ReadComponents(TaskWithStaleCopy, ServiceTaskLayout),
            .. ReadComponents(TaskWithStaleCopy, "Copies"),
        ];
        Assert.DoesNotContain(components, component => (string)component["id"] == "previous-vehicles");
        JsonNode selectedCopy = Assert.Single(components, component => (string)component["id"] == "vehicles");
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), selectedCopy));
        Assert.True(
            JsonNode.DeepEquals(unrelatedCopy, components.Single(component => (string)component["id"] == "notes"))
        );
        Assert.Contains(components, component => (string)component["id"] == "copies-description");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SaveSubformPdfComponent_WhenPreviousCopyWasCustomized_PreservesIt(bool hidden)
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        JsonArray components = ReadComponents(TaskWithStaleCopy, "Copies");
        JsonNode previousCopy = components.Single(component => (string)component["id"] == "notes");
        previousCopy["hidden"] = hidden;
        if (hidden)
        {
            previousCopy["textResourceBindings"] = new JsonObject { ["title"] = "custom-title" };
        }
        WriteComponents(TaskWithStaleCopy, "Copies", components);

        await service.SaveSubformPdfComponent(
            editingContext,
            TaskWithStaleCopy,
            "vehicles",
            DataTask,
            "notes",
            CancellationToken.None
        );

        JsonNode preserved = ReadComponents(TaskWithStaleCopy, "Copies")
            .Single(component => (string)component["id"] == "notes");
        Assert.True(JsonNode.DeepEquals(previousCopy, preserved));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenCopyIsUnchanged_WritesNothing()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string[] before = UiFolderContents();

        await service.SaveSubformPdfComponent(
            editingContext,
            TaskWithCopy,
            "vehicles",
            DataTask,
            null,
            CancellationToken.None
        );

        Assert.Equal(before, UiFolderContents());
    }

    [Theory]
    [InlineData("unknown", DataTask, typeof(SubformComponentNotFoundException))]
    [InlineData("intro", DataTask, typeof(SubformComponentNotFoundException))]
    [InlineData("vehicles", "unknownLayoutSet", typeof(SubformComponentNotFoundException))]
    [InlineData("missing-layout-set", DataTask, typeof(SubformComponentMissingLayoutSetException))]
    [InlineData("notes", DataTask, typeof(SubformMissingDefaultDataTypeException))]
    [InlineData("vehicles", null, typeof(InvalidLayoutSetIdException))]
    public async Task SaveSubformPdfComponent_WhenSourceCannotBeCopied_ThrowsAndWritesNothing(
        string componentId,
        string sourceLayoutSetId,
        Type expectedException
    )
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string[] before = UiFolderContents();

        await Assert.ThrowsAsync(
            expectedException,
            () =>
                service.SaveSubformPdfComponent(
                    editingContext,
                    TaskWithoutPages,
                    componentId,
                    sourceLayoutSetId,
                    null,
                    CancellationToken.None
                )
        );
        Assert.Equal(before, UiFolderContents());
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenNewLayoutSetIdIsInvalid_ThrowsAndWritesNothing()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string processPath = Path.Combine(_testRepoPath, "App", "config", "process", "process.bpmn");
        string process = await File.ReadAllTextAsync(processPath);
        await File.WriteAllTextAsync(processPath, process.Replace(TaskWithoutPages, "new task"));
        string[] before = UiFolderContents();

        await Assert.ThrowsAsync<InvalidLayoutSetIdException>(() =>
            service.SaveSubformPdfComponent(
                editingContext,
                "new task",
                "vehicles",
                DataTask,
                null,
                CancellationToken.None
            )
        );
        Assert.Equal(before, UiFolderContents());
    }

    [Theory]
    [InlineData(DataTask)]
    [InlineData("vehicleSubform")]
    [InlineData("NotInProcess")]
    public async Task SaveSubformPdfComponent_WhenLayoutSetIsNotASubformPdfTask_ThrowsAndWritesNothing(
        string layoutSetId
    )
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string[] before = UiFolderContents();

        await Assert.ThrowsAsync<LayoutSetIsNotSubformPdfTaskException>(() =>
            service.SaveSubformPdfComponent(
                editingContext,
                layoutSetId,
                "vehicles",
                DataTask,
                null,
                CancellationToken.None
            )
        );
        Assert.Equal(before, UiFolderContents());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DeleteSubformPdfComponent_RemovesOnlyUnchangedGeneratedCopies(bool customized)
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        JsonArray components = ReadComponents(TaskWithStaleCopy, "Copies");
        if (customized)
        {
            components.Single(component => (string)component["id"] == "notes")["textResourceBindings"] = new JsonObject
            {
                ["title"] = "custom-title",
            };
        }
        WriteComponents(TaskWithStaleCopy, "Copies", components);
        string waitingPageBefore = ReadFile(LayoutPath(TaskWithStaleCopy, ServiceTaskLayout));

        for (int i = 0; i < 2; i++)
        {
            await service.DeleteSubformPdfComponent(editingContext, TaskWithStaleCopy, "notes", CancellationToken.None);
        }

        JsonArray remaining = ReadComponents(TaskWithStaleCopy, "Copies");
        Assert.Equal(customized ? 3 : 2, remaining.Count);
        Assert.Equal(customized, remaining.Any(component => (string)component["id"] == "notes"));
        Assert.Contains(remaining, component => (string)component["id"] == "vehicles");
        Assert.Contains(remaining, component => (string)component["id"] == "copies-description");
        Assert.Equal(waitingPageBefore, ReadFile(LayoutPath(TaskWithStaleCopy, ServiceTaskLayout)));
    }

    [Fact]
    public async Task DeleteSubformPdfComponent_WhenTaskPagesWereDeleted_WritesNothing()
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string[] before = UiFolderContents();

        await service.DeleteSubformPdfComponent(editingContext, TaskWithoutPages, "vehicles", CancellationToken.None);

        Assert.Equal(before, UiFolderContents());
        Assert.False(Directory.Exists(Path.Combine(_testRepoPath, "App", "ui", TaskWithoutPages)));
    }

    [Theory]
    [InlineData(DataTask)]
    [InlineData("vehicleSubform")]
    [InlineData("NotInProcess")]
    public async Task DeleteSubformPdfComponent_WhenLayoutSetIsNotASubformPdfTask_ThrowsAndWritesNothing(
        string layoutSetId
    )
    {
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(SubformPdfRepo);
        string[] before = UiFolderContents();

        await Assert.ThrowsAsync<LayoutSetIsNotSubformPdfTaskException>(() =>
            service.DeleteSubformPdfComponent(editingContext, layoutSetId, "vehicles", CancellationToken.None)
        );
        Assert.Equal(before, UiFolderContents());
    }

    private async Task<(AltinnRepoEditingContext editingContext, UiFoldersService service)> CreateTestContext(
        string repo = Repo
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );
        UiFoldersService service = new(
            new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory()),
            new Mock<IProcessModelingService>().Object,
            new Mock<IPublisher>().Object,
            NullLogger<UiFoldersService>.Instance
        );
        return (editingContext, service);
    }

    private static string SettingsPath(string layoutSetName) =>
        Path.Combine("App", "ui", layoutSetName, "Settings.json");

    private static string LayoutPath(string layoutSetName, string layoutName) =>
        Path.Combine("App", "ui", layoutSetName, "layouts", $"{layoutName}.json");

    private static JsonObject VehiclesCopy() =>
        new()
        {
            ["id"] = "vehicles",
            ["type"] = "Subform",
            ["layoutSet"] = "vehicleSubform",
            ["hidden"] = true,
        };

    private string ReadFile(string relativePath) => File.ReadAllText(Path.Combine(_testRepoPath, relativePath));

    private JsonArray ReadComponents(string layoutSetName, string layoutName) =>
        JsonNode.Parse(ReadFile(LayoutPath(layoutSetName, layoutName)))["data"]["layout"].AsArray();

    private void WriteComponents(string layoutSetName, string layoutName, JsonArray components)
    {
        string path = LayoutPath(layoutSetName, layoutName);
        JsonNode page = JsonNode.Parse(ReadFile(path));
        page["data"]["layout"] = components.DeepClone();
        File.WriteAllText(Path.Combine(_testRepoPath, path), page.ToJsonString());
    }

    private string[] UiFolderContents()
    {
        string uiDirectory = Path.Combine(_testRepoPath, "App", "ui");
        return
        [
            .. Directory
                .EnumerateFileSystemEntries(uiDirectory, "*", SearchOption.AllDirectories)
                .Order(StringComparer.Ordinal)
                .Select(entry =>
                    File.Exists(entry)
                        ? $"{Path.GetRelativePath(uiDirectory, entry)}:{File.ReadAllText(entry)}"
                        : Path.GetRelativePath(uiDirectory, entry)
                ),
        ];
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(_testRepoPath))
        {
            TestDataHelper.DeleteDirectory(_testRepoPath);
        }
    }
}
