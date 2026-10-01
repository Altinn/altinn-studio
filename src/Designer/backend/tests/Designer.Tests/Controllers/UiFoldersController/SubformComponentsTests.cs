using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
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
    private const string TaskWithStaleCopy = "PdfWithStaleCopy";
    private const string TaskWithCopy = "PdfWithCopy";
    private const string ServiceTaskLayout = "ServiceTask";

    private static string SubformComponentsUrl(string repository) =>
        $"/designer/api/{Org}/{repository}/ui-folders/subform-components";

    private static string SettingsPath(string layoutSetName) => $"App/ui/{layoutSetName}/Settings.json";

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

    private static async Task<List<SubformComponentDto>> ReadSubformComponents(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<List<SubformComponentDto>>(await response.Content.ReadAsStringAsync());

    private static JsonObject FindDataTaskEntry(JsonArray subformComponents, string componentId) =>
        subformComponents
            .Select(entry => entry.AsObject())
            .Single(entry => (string)entry["layoutSetId"] == DataTask && (string)entry["componentId"] == componentId);
}
