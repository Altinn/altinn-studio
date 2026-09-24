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
    public async Task GetSubformComponents_ListsComponentsInProcessFlowPageAndComponentOrder()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<SubformComponentDto> subformComponents = await ReadSubformComponents(response);

        // Layout sets follow the process flow rather than their folder names, and pages follow the page order
        // rather than their file names.
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

    [Fact]
    public async Task GetSubformComponents_ResolvesDataTypeFromSubformLayoutSet()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(SubformComponentsUrl(targetRepository));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonArray subformComponents = JsonNode.Parse(await response.Content.ReadAsStringAsync()).AsArray();

        JsonObject vehicles = FindDataTaskEntry(subformComponents, "vehicles");
        Assert.Equal("vehicleSubform", (string)vehicles["subformLayoutSetId"]);
        Assert.Equal("vehicle", (string)vehicles["subformDataTypeId"]);

        // What cannot be resolved is sent as null rather than left out.
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
    public async Task GetSubformComponents_LeavesOutComponentsInsideSubforms()
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

        // The task starts on the data task's type, which has one element per instance, not on the subform's type.
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
        Assert.Equal("vehicle", copy.SubformDataTypeId);
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetHoldsOtherSubformComponents_ReplacesThemWithCopy()
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

        // The copy goes on the page that held the Subform components, and the page keeps its other components.
        JsonArray components = ReadComponents(targetRepository, TaskWithStaleCopy, "Copies");
        Assert.Equal(["copies-description", "vehicles"], components.Select(component => (string)component["id"]));
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));
        Assert.Equal(waitingPageBefore, ReadFile(targetRepository, LayoutPath(TaskWithStaleCopy, ServiceTaskLayout)));
    }

    [Fact]
    public async Task SaveSubformPdfComponent_WhenLayoutSetAlreadyHoldsCopy_WritesNothing()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        // The test data is indented differently from what Designer writes, so a rewrite would show.
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
    public async Task SaveSubformPdfComponent_WhenPayloadLacksValue_ReturnsValidationProblem(
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
    public async Task SaveSubformPdfComponent_WhenMissingLayoutSetIdBreaksNamingPolicy_ReturnsBadRequest()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

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
    public async Task SaveSubformPdfComponent_WhenLayoutSetIsNotAProcessTask_CreatesItWithHiddenCopy()
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
        // A task the saved process does not have yet has no known type, so it is let through.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonArray components = ReadComponents(targetRepository, LayoutSetNotInProcess, ServiceTaskLayout);
        Assert.True(JsonNode.DeepEquals(VehiclesCopy(), components.Last()));
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
        string sourceLayoutSetId
    )
    {
        SubformPdfComponentPayload payload = new() { ComponentId = componentId, SourceLayoutSetId = sourceLayoutSetId };
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

    /// <summary>
    /// Lists the relative path and content of every file in a layout set of the repository under test, in a
    /// stable order.
    /// </summary>
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

    private static JsonArray ReadComponents(string repository, string layoutSetName, string layoutName) =>
        JsonNode.Parse(ReadFile(repository, LayoutPath(layoutSetName, layoutName)))["data"]["layout"].AsArray();
}
