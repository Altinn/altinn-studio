using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.AppDevelopment;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.UiFoldersController;

public class SubformComponentsTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<SubformComponentsTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string AppV9 = "app-with-subform-pdf-v9";
    private const string AppV8 = "app-with-layoutsets";
    private const string Developer = "testUser";
    private const string DataTask = "Task_1";
    private const string TaskWithoutPages = "PdfWithoutPages";
    private const string TaskWithStaleCopy = "PdfWithStaleCopy";
    private const string TaskWithCopy = "PdfWithCopy";
    private const string ServiceTaskLayout = "ServiceTask";

    private static string SubformComponentsUrl(string repository) =>
        $"/designer/api/{Org}/{repository}/ui-folders/subform-components";

    private static string SubformPdfComponentUrl(string repository, string layoutSetId) =>
        $"/designer/api/{Org}/{repository}/ui-folders/layout-sets/{layoutSetId}/subform-pdf-component";

    private static string SettingsPath(string layoutSetName) => $"App/ui/{layoutSetName}/Settings.json";

    private static string LayoutPath(string layoutSetName, string layoutName) =>
        $"App/ui/{layoutSetName}/layouts/{layoutName}.json";

    private static JsonObject VehiclesCopy() =>
        new()
        {
            ["id"] = "vehicles",
            ["type"] = "Subform",
            ["layoutSet"] = "vehicleSubform",
            ["hidden"] = true,
        };

    [Fact]
    public async Task GetSubformComponents_OrdersByProcessFlowThenPageThenComponent()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<SubformComponentDto> subformComponents = await ReadSubformComponents(response);

        (string, string, string)[] expected =
        [
            (DataTask, "Overview", "vehicles"),
            (DataTask, "Overview", "notes"),
            (DataTask, "Details", "missing-layout-set"),
            (TaskWithStaleCopy, "Copies", "notes"),
            (TaskWithStaleCopy, "Copies", "vehicles"),
            (TaskWithCopy, ServiceTaskLayout, "vehicles"),
        ];
        Assert.Equal(
            expected,
            subformComponents.Select(component => (component.LayoutSetId, component.LayoutName, component.ComponentId))
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetSubformComponents_ResolvesDataTypeFromSubformLayoutSet(bool classifiedAsSubform)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        if (!classifiedAsSubform)
        {
            string settingsPath = Path.Combine(TestRepoPath, SettingsPath("vehicleSubform"));
            JsonObject settings = JsonNode.Parse(await File.ReadAllTextAsync(settingsPath)).AsObject();
            settings.Remove("type");
            await File.WriteAllTextAsync(settingsPath, settings.ToJsonString());
        }

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonArray subformComponents = JsonNode.Parse(await response.Content.ReadAsStringAsync()).AsArray();

        JsonObject vehicles = FindDataTaskEntry(subformComponents, "vehicles");
        Assert.Equal("data", (string)vehicles["taskType"]);
        Assert.Equal("vehicleSubform", (string)vehicles["subformLayoutSetId"]);
        Assert.Equal("vehicle", (string)vehicles["subformDataTypeId"]);

        JsonObject notes = FindDataTaskEntry(subformComponents, "notes");
        Assert.Equal("notesSubform", (string)notes["subformLayoutSetId"]);
        Assert.True(notes.ContainsKey("subformDataTypeId"));
        Assert.Null(notes["subformDataTypeId"]);

        JsonObject missingLayoutSet = FindDataTaskEntry(subformComponents, "missing-layout-set");
        Assert.True(missingLayoutSet.ContainsKey("subformLayoutSetId"));
        Assert.Null(missingLayoutSet["subformLayoutSetId"]);
        Assert.True(missingLayoutSet.ContainsKey("subformDataTypeId"));
        Assert.Null(missingLayoutSet["subformDataTypeId"]);
    }

    [Fact]
    public async Task GetSubformComponents_ExcludesComponentsInsideSubforms()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<SubformComponentDto> subformComponents = await ReadSubformComponents(response);
        Assert.DoesNotContain(subformComponents, component => component.ComponentId == "subform-inside-subform");
    }

    [Fact]
    public async Task GetSubformComponents_WhenAppIsNotV9_ReturnsBadRequest()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV8, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetIsMissing_CreatesItWithHiddenCopy()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithoutPages,
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // The task needs the data type with one element per instance, rather than the type used for subform
        // entries.
        JsonNode settings = JsonNode.Parse(ReadFile(targetRepository, SettingsPath(TaskWithoutPages)));
        Assert.Equal("model", (string)settings["defaultDataType"]);
        Assert.Equal([ServiceTaskLayout], settings["pages"]["order"].AsArray().Select(page => (string)page));

        JsonArray components = ReadComponents(targetRepository, TaskWithoutPages, ServiceTaskLayout);
        Assert.Contains(components, component => (string)component["id"] == "service-task-waiting-title");
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));

        List<SubformComponentDto> subformComponents = await ReadSubformComponents(response);
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
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        string waitingPageBefore = ReadFile(targetRepository, LayoutPath(TaskWithStaleCopy, ServiceTaskLayout));

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithStaleCopy,
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        JsonArray components = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        Assert.Equal(
            ["notes", "copies-description", "vehicles"],
            components.Select(component => (string)component["id"])
        );
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));
        Assert.Equal(waitingPageBefore, ReadFile(targetRepository, LayoutPath(TaskWithStaleCopy, ServiceTaskLayout)));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenSelectionChanges_ReplacesPreviousCopy()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        JsonArray sourceComponents = ReadComponents(targetRepository, DataTask, "Overview");
        JsonObject secondComponent = VehiclesCopy();
        secondComponent["id"] = "other-vehicles";
        secondComponent.Remove("hidden");
        sourceComponents.Add(secondComponent);
        WriteComponents(targetRepository, DataTask, "Overview", sourceComponents);

        // Act / Assert
        string previousComponentId = "vehicles";
        foreach (string componentId in new[] { "other-vehicles", "vehicles", "other-vehicles" })
        {
            using HttpResponseMessage response = await PostSubformPdfComponent(
                targetRepository,
                TaskWithCopy,
                componentId,
                DataTask,
                previousComponentId
            );

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            JsonNode copy = Assert.Single(
                ReadComponents(targetRepository, TaskWithCopy, ServiceTaskLayout),
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
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        JsonArray waitingComponents = ReadComponents(targetRepository, TaskWithStaleCopy, ServiceTaskLayout);
        JsonArray copyComponents = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        for (int i = 0; i < previousCopyCount; i++)
        {
            JsonObject previousCopy = VehiclesCopy();
            previousCopy["id"] = "previous-vehicles";
            (i == 0 ? waitingComponents : copyComponents).Add(previousCopy);
        }
        waitingComponents.Add(VehiclesCopy());
        WriteComponents(targetRepository, TaskWithStaleCopy, ServiceTaskLayout, waitingComponents);
        WriteComponents(targetRepository, TaskWithStaleCopy, "Copies", copyComponents);
        JsonNode unrelatedCopy = copyComponents.Single(component => (string)component["id"] == "notes").DeepClone();

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithStaleCopy,
            "vehicles",
            DataTask,
            "previous-vehicles"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode[] components =
        [
            .. ReadComponents(targetRepository, TaskWithStaleCopy, ServiceTaskLayout),
            .. ReadComponents(targetRepository, TaskWithStaleCopy, "Copies"),
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
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        JsonArray components = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        JsonNode previousCopy = components.Single(component => (string)component["id"] == "notes");
        previousCopy["hidden"] = hidden;
        if (hidden)
        {
            previousCopy["textResourceBindings"] = new JsonObject { ["title"] = "custom-title" };
        }
        WriteComponents(targetRepository, TaskWithStaleCopy, "Copies", components);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithStaleCopy,
            "vehicles",
            DataTask,
            "notes"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode preserved = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies")
            .Single(component => (string)component["id"] == "notes");
        Assert.True(JsonNode.DeepEquals(previousCopy, preserved));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DeleteSubformPdfComponent_RemovesOnlyUnchangedGeneratedCopies(bool customized)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        JsonArray components = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        if (customized)
        {
            components.Single(component => (string)component["id"] == "notes")["textResourceBindings"] = new JsonObject
            {
                ["title"] = "custom-title",
            };
        }
        WriteComponents(targetRepository, TaskWithStaleCopy, "Copies", components);
        string waitingPageBefore = ReadFile(targetRepository, LayoutPath(TaskWithStaleCopy, ServiceTaskLayout));

        // Deleting twice must succeed, including when the copy is already missing.
        for (int i = 0; i < 2; i++)
        {
            using HttpResponseMessage response = await HttpClient.DeleteAsync(
                $"{SubformPdfComponentUrl(targetRepository, TaskWithStaleCopy)}?componentId=notes"
            );
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        // Assert
        JsonArray remaining = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        Assert.Equal(customized ? 3 : 2, remaining.Count);
        Assert.Equal(customized, remaining.Any(component => (string)component["id"] == "notes"));
        Assert.Contains(remaining, component => (string)component["id"] == "vehicles");
        Assert.Contains(remaining, component => (string)component["id"] == "copies-description");
        Assert.Equal(waitingPageBefore, ReadFile(targetRepository, LayoutPath(TaskWithStaleCopy, ServiceTaskLayout)));
    }

    [Fact]
    public async Task DeleteSubformPdfComponent_WhenTaskPagesWereDeleted_WritesNothing()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(
            $"{SubformPdfComponentUrl(targetRepository, TaskWithoutPages)}?componentId=vehicles"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", TaskWithoutPages)));
    }

    [Theory]
    [InlineData(AppV8, "layoutSet1")]
    [InlineData(AppV9, DataTask)]
    public async Task DeleteSubformPdfComponent_RejectsUnsupportedTaskAndApp(string app, string layoutSetId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, app, Developer, targetRepository);
        string[] before = LayoutSetFileContents(layoutSetId);

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(
            $"{SubformPdfComponentUrl(targetRepository, layoutSetId)}?componentId=vehicles"
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, LayoutSetFileContents(layoutSetId));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenCopyIsUnchanged_DoesNotWriteFiles()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        // Different fixture formatting makes unintended file rewrites visible.
        string layoutBefore = ReadFile(targetRepository, LayoutPath(TaskWithCopy, ServiceTaskLayout));

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithCopy,
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(layoutBefore, ReadFile(targetRepository, LayoutPath(TaskWithCopy, ServiceTaskLayout)));
    }

    [Theory]
    [InlineData("unknown", DataTask, AppDevelopmentErrorCodes.SubformComponentNotFound)]
    // "intro" is a Paragraph, not a Subform component.
    [InlineData("intro", DataTask, AppDevelopmentErrorCodes.SubformComponentNotFound)]
    [InlineData("vehicles", "unknownLayoutSet", AppDevelopmentErrorCodes.SubformComponentNotFound)]
    [InlineData("missing-layout-set", DataTask, AppDevelopmentErrorCodes.SubformComponentMissingLayoutSet)]
    [InlineData("notes", DataTask, AppDevelopmentErrorCodes.SubformMissingDefaultDataType)]
    public async Task SaveSubformPdfComponent_WhenSourceComponentCannotBeCopied_ReturnsErrorCodeAndWritesNothing(
        string componentId,
        string sourceLayoutSetId,
        string expectedErrorCode
    )
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            TaskWithoutPages,
            componentId,
            sourceLayoutSetId
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(expectedErrorCode, await ReadErrorCode(response));
        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", TaskWithoutPages)));
    }

    [Theory]
    [InlineData("""{ "sourceLayoutSetId": "Task_1" }""", "ComponentId")]
    [InlineData("""{ "componentId": null, "sourceLayoutSetId": "Task_1" }""", "ComponentId")]
    [InlineData("""{ "componentId": "vehicles", "sourceLayoutSetId": " " }""", "SourceLayoutSetId")]
    public async Task SaveSubformPdfComponent_WhenRequiredValueIsMissing_ReturnsValidationProblem(
        string payload,
        string expectedInvalidField
    )
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(targetRepository, TaskWithoutPages, payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        ValidationProblemDetails validationProblem = JsonSerializer.Deserialize<ValidationProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );
        Assert.Equal([expectedInvalidField], validationProblem.Errors.Keys);
        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", TaskWithoutPages)));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenNewLayoutSetIdIsInvalid_ReturnsBadRequest()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        string processPath = Path.Combine(TestRepoPath, "App", "config", "process", "process.bpmn");
        string process = await File.ReadAllTextAsync(processPath);
        await File.WriteAllTextAsync(processPath, process.Replace(TaskWithoutPages, "new task"));

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            "new%20task",
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppDevelopmentErrorCodes.InvalidLayoutSetIdError, await ReadErrorCode(response));
        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", "new task")));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetBelongsToAnotherTaskType_ReturnsErrorCodeAndWritesNothing()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        string[] dataTaskFilesBefore = LayoutSetFileContents(DataTask);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            DataTask,
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppDevelopmentErrorCodes.LayoutSetIsNotSubformPdfTask, await ReadErrorCode(response));
        Assert.Equal(dataTaskFilesBefore, LayoutSetFileContents(DataTask));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenTargetIsASubform_ReturnsErrorCodeAndWritesNothing()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        const string Subform = "vehicleSubform";
        string[] filesBefore = LayoutSetFileContents(Subform);

        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            Subform,
            "vehicles",
            DataTask
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppDevelopmentErrorCodes.LayoutSetIsNotSubformPdfTask, await ReadErrorCode(response));
        Assert.Equal(filesBefore, LayoutSetFileContents(Subform));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetIsNotAProcessTask_ReturnsErrorCodeAndWritesNothing()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        const string LayoutSetNotInProcess = "NotInProcess";

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            LayoutSetNotInProcess,
            "vehicles",
            DataTask
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppDevelopmentErrorCodes.LayoutSetIsNotSubformPdfTask, await ReadErrorCode(response));
        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", LayoutSetNotInProcess)));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenAppIsNotV9_ReturnsBadRequest()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV8, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await PostSubformPdfComponent(
            targetRepository,
            "layoutSet1",
            "vehicles",
            "layoutSet2"
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    private Task<HttpResponseMessage> PostSubformPdfComponent(
        string repository,
        string layoutSetId,
        string componentId,
        string sourceLayoutSetId,
        string previousComponentId = null
    )
    {
        SubformPdfComponentPayload payload = new()
        {
            ComponentId = componentId,
            SourceLayoutSetId = sourceLayoutSetId,
            PreviousComponentId = previousComponentId,
        };
        return PostSubformPdfComponent(repository, layoutSetId, JsonSerializer.Serialize(payload));
    }

    private async Task<HttpResponseMessage> PostSubformPdfComponent(
        string repository,
        string layoutSetId,
        string payload
    )
    {
        using HttpRequestMessage httpRequestMessage = new(
            HttpMethod.Post,
            SubformPdfComponentUrl(repository, layoutSetId)
        )
        {
            Content = new StringContent(payload, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private static async Task<List<SubformComponentDto>> ReadSubformComponents(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<List<SubformComponentDto>>(await response.Content.ReadAsStringAsync());

    private static async Task<string> ReadErrorCode(HttpResponseMessage response)
    {
        ProblemDetails problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );
        return ((JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode]).ToString();
    }

    private static JsonObject FindDataTaskEntry(JsonArray subformComponents, string componentId) =>
        subformComponents
            .Select(entry => entry.AsObject())
            .Single(entry => (string)entry["layoutSetId"] == DataTask && (string)entry["componentId"] == componentId);

    private static string ReadFile(string repository, string relativePath) =>
        TestDataHelper.GetFileFromRepo(Org, repository, Developer, relativePath);

    private string[] LayoutSetFileContents(string layoutSetName)
    {
        string layoutSetDirectory = Path.Combine(TestRepoPath, "App", "ui", layoutSetName);
        return
        [
            .. Directory
                .EnumerateFiles(layoutSetDirectory, "*", SearchOption.AllDirectories)
                .Order(StringComparer.Ordinal)
                .Select(file => $"{Path.GetRelativePath(layoutSetDirectory, file)}:{File.ReadAllText(file)}"),
        ];
    }

    private void WriteComponents(string repository, string layoutSetName, string layoutName, JsonArray components)
    {
        string path = LayoutPath(layoutSetName, layoutName);
        JsonNode page = JsonNode.Parse(ReadFile(repository, path));
        page["data"]["layout"] = components.DeepClone();
        File.WriteAllText(Path.Combine(TestRepoPath, path), page.ToJsonString());
    }

    private static JsonArray ReadComponents(string repository, string layoutSetName, string layoutName) =>
        JsonNode.Parse(ReadFile(repository, LayoutPath(layoutSetName, layoutName)))["data"]["layout"].AsArray();
}
