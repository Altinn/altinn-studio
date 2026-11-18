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
using System.Xml.Linq;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.UiFoldersController;

public class LayoutSetTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<LayoutSetTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/ui-folders/layout-sets";

    private static string SettingsPath(string layoutSetName) => $"App/ui/{layoutSetName}/Settings.json";

    private static string LayoutPath(string layoutSetName, string layoutName) =>
        $"App/ui/{layoutSetName}/layouts/{layoutName}.json";

    private static string InitialLayoutPath(string layoutSetName) => LayoutPath(layoutSetName, "Side1");

    private const string ApplicationMetadataPath = "App/config/applicationmetadata.json";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task GetLayoutSets_WhenNoDerivableSets_ReturnsEmptyArray(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal("[]", actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets-v9", "testUser")]
    public async Task GetLayoutSets_WhenSetsExist_ReturnsDerivedSets(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        List<LayoutSetConfigDto> layoutSets = JsonSerializer.Deserialize<List<LayoutSetConfigDto>>(content);

        Assert.Equal(2, layoutSets.Count);

        LayoutSetConfigDto dataSet = Assert.Single(layoutSets, layoutSet => layoutSet.Id == "Task_1");
        Assert.Equal("model", dataSet.DataType);

        LayoutSetConfigDto subform = Assert.Single(layoutSets, layoutSet => layoutSet.Id == "moreInfoSubform");
        Assert.Equal("subform", subform.Type);
    }

    [Theory]
    [InlineData("ttd", "app-with-subform-pdf-v9", "testUser")]
    public async Task GetLayoutSets_WhenSubformFolderIsUnmarked_ReturnsItAsSubformWhenASubformComponentOpensIt(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        // The app treats a folder as a subform when a Subform component opens it, with or without the marker.
        string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);
        string settingsFile = Path.Join(repositoryDirectory, SettingsPath("notesSubform"));
        JsonObject settings = JsonNode.Parse(await File.ReadAllTextAsync(settingsFile))!.AsObject();
        settings.Remove("type");
        await File.WriteAllTextAsync(settingsFile, settings.ToJsonString());
        Directory.CreateDirectory(Path.Join(repositoryDirectory, "App", "ui", "unusedFolder"));
        await File.WriteAllTextAsync(settingsFile.Replace("notesSubform", "unusedFolder"), settings.ToJsonString());

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, VersionPrefix(org, targetRepository));
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        List<LayoutSetConfigDto> layoutSets = JsonSerializer.Deserialize<List<LayoutSetConfigDto>>(
            await response.Content.ReadAsStringAsync()
        );
        LayoutSetConfigDto notesSubform = Assert.Single(layoutSets, layoutSet => layoutSet.Id == "notesSubform");
        Assert.Equal("subform", notesSubform.Type);
        Assert.DoesNotContain(layoutSets, layoutSet => layoutSet.Id == "unusedFolder");
        Assert.Null(Assert.Single(layoutSets, layoutSet => layoutSet.Id == "Task_1").Type);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenValidPayload_CreatesLayoutSetFiles(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "newLayoutSet";
        var payload = new LayoutSetPayload
        {
            TaskType = TaskType.Data,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, DataType = "model" },
        };

        using HttpResponseMessage response = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.True(
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, InitialLayoutPath(NewLayoutSetName))
        );

        string savedSettings = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            SettingsPath(NewLayoutSetName)
        );
        JsonNode settings = JsonNode.Parse(savedSettings);
        Assert.Equal("model", (string)settings["defaultDataType"]);
        Assert.Equal("Side1", (string)settings["pages"]["order"].AsArray()[0]);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenSubform_CreatesSetAndReturnsItInResponse(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "newSubform";
        var payload = new LayoutSetPayload
        {
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, Type = "subform" },
        };

        using HttpResponseMessage response = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        List<LayoutSetConfigDto> layoutSets = JsonSerializer.Deserialize<List<LayoutSetConfigDto>>(content);
        LayoutSetConfigDto created = Assert.Single(layoutSets, layoutSet => layoutSet.Id == NewLayoutSetName);
        Assert.Equal("subform", created.Type);

        string savedSettings = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            SettingsPath(NewLayoutSetName)
        );
        Assert.Equal("subform", (string)JsonNode.Parse(savedSettings)["type"]);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenPdfTask_CreatesOnlyPdfLayoutWithEmptyOrder(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "pdfTask";
        var payload = new LayoutSetPayload
        {
            TaskType = TaskType.Pdf,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, DataType = "model" },
        };

        using HttpResponseMessage response = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutsDirectory = Path.Join(
            TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer),
            "App",
            "ui",
            NewLayoutSetName,
            "layouts"
        );
        string layoutFile = Assert.Single(Directory.GetFiles(layoutsDirectory));
        Assert.Equal("PdfLayout.json", Path.GetFileName(layoutFile));

        JsonNode pdfLayout = JsonNode.Parse(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, LayoutPath(NewLayoutSetName, "PdfLayout"))
        );
        Assert.Empty(pdfLayout["data"]["layout"].AsArray());

        JsonNode settings = JsonNode.Parse(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, SettingsPath(NewLayoutSetName))
        );
        Assert.Equal("PdfLayout", (string)settings["pages"]["pdfLayoutName"]);
        Assert.Empty(settings["pages"]["order"].AsArray());
        Assert.Equal("model", (string)settings["defaultDataType"]);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenPdfTask_PagesListNoPageUntilOneIsAdded(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "pdfTask";
        var payload = new LayoutSetPayload
        {
            TaskType = TaskType.Pdf,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, DataType = "model" },
        };
        using HttpResponseMessage addResponse = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);

        string pagesUrl = $"/designer/api/{org}/{targetRepository}/layouts/layoutSet/{NewLayoutSetName}/pages";
        PagesDto pagesBefore = await GetPages(pagesUrl);
        Assert.NotNull(pagesBefore.Pages);
        Assert.Empty(pagesBefore.Pages);
        Assert.Equal("PdfLayout", pagesBefore.PdfLayoutName);

        using var createPageRequest = new HttpRequestMessage(HttpMethod.Post, pagesUrl)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new PageDto { Id = "WaitingPage" }),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        using HttpResponseMessage createPageResponse = await HttpClient.SendAsync(createPageRequest);
        Assert.Equal(HttpStatusCode.Created, createPageResponse.StatusCode);

        PagesDto pagesAfter = await GetPages(pagesUrl);
        PageDto page = Assert.Single(pagesAfter.Pages);
        Assert.Equal("WaitingPage", page.Id);
        Assert.Equal("PdfLayout", pagesAfter.PdfLayoutName);
    }

    private async Task<PagesDto> GetPages(string pagesUrl)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, pagesUrl);
        using HttpResponseMessage response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonSerializer.Deserialize<PagesDto>(await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenSubformPdfTask_ReturnsBadRequestAndCreatesNoUiFolder(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "subformPdfTask";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, VersionPrefix(org, targetRepository))
        {
            Content = new StringContent(
                """{"taskType":"subformPdf","LayoutSetConfig":{"id":"subformPdfTask","dataType":"model"}}""",
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(NewLayoutSetName)));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenIdAlreadyExists_ReturnsOkWithInfoMessage(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        var payload = new LayoutSetPayload { LayoutSetConfigDto = new LayoutSetConfigDto { Id = "form" } };

        using HttpResponseMessage response = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        Assert.Contains("infoMessage", content);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenInvalidId_ReturnsBadRequest(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        var payload = new LayoutSetPayload { LayoutSetConfigDto = new LayoutSetConfigDto { Id = "invalid name!" } };

        using HttpResponseMessage response = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateLayoutSetName_WhenValidName_RenamesFolder(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string OldLayoutSetName = "form";
        const string NewLayoutSetName = "renamedForm";

        string url = $"{VersionPrefix(org, targetRepository)}/{OldLayoutSetName}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(NewLayoutSetName),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.True(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(NewLayoutSetName)));
        Assert.False(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(OldLayoutSetName)));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task DeleteLayoutSet_WhenExists_RemovesFolder(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string LayoutSetToDelete = "subform";

        string url = $"{VersionPrefix(org, targetRepository)}/{LayoutSetToDelete}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.False(
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(LayoutSetToDelete))
        );
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets-v9", "testUser")]
    public async Task DeleteLayoutSet_WhenDataTypeBelongsToAnotherTask_KeepsTaskBinding(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        // A custom receipt reuses an existing task's data type: "model" is bound to "Task_1".
        const string CustomReceipt = "CustomReceipt";
        var payload = new LayoutSetPayload
        {
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = CustomReceipt, DataType = "model" },
        };
        using HttpResponseMessage addResponse = await PostLayoutSet(org, targetRepository, payload);
        Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);

        // Deleting the receipt must not clear the "model" data type's binding to "Task_1".
        string deleteUrl = $"{VersionPrefix(org, targetRepository)}/{CustomReceipt}";
        using var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
        using HttpResponseMessage deleteResponse = await HttpClient.SendAsync(deleteRequest);
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        string metadata = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, ApplicationMetadataPath);
        JsonNode modelDataType = JsonNode
            .Parse(metadata)!["dataTypes"]
            .AsArray()
            .Single(dataType => (string)dataType["id"] == "model");
        Assert.Equal("Task_1", (string)modelDataType["taskId"]);
    }

    [Theory]
    [InlineData("ttd", "app-with-subform-pdf-v9", "testUser")]
    public async Task UpdateLayoutSetName_WhenSubformPdfTaskNamesTheFolder_RenamesSubformUiFolderInProcess(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = $"{VersionPrefix(org, targetRepository)}/vehicleSubform";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize("vehicles"),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        XElement subformPdfConfig = GetSubformPdfConfig(org, targetRepository, developer, "SubformPdf");
        Assert.Equal("vehicles", subformPdfConfig.Element(AltinnNamespace + "subformUiFolder")?.Value);
    }

    [Theory]
    [InlineData("ttd", "app-with-subform-pdf-v9", "testUser")]
    public async Task DeleteLayoutSet_WhenSubformPdfTaskNamesTheFolder_RemovesSubformUiFolderFromProcess(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = $"{VersionPrefix(org, targetRepository)}/vehicleSubform";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        XElement subformPdfConfig = GetSubformPdfConfig(org, targetRepository, developer, "SubformPdf");
        Assert.Null(subformPdfConfig.Element(AltinnNamespace + "subformUiFolder"));
    }

    private static readonly XNamespace AltinnNamespace = "http://altinn.no/process";

    private static XElement GetSubformPdfConfig(string org, string repository, string developer, string taskId)
    {
        XDocument process = XDocument.Parse(
            TestDataHelper.GetFileFromRepo(org, repository, developer, "App/config/process/process.bpmn")
        );
        return process
            .Descendants()
            .Single(element => (string)element.Attribute("id") == taskId)
            .Descendants(AltinnNamespace + "subformPdfConfig")
            .Single();
    }

    private async Task<HttpResponseMessage> PostLayoutSet(string org, string repository, LayoutSetPayload payload)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, VersionPrefix(org, repository))
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        return await HttpClient.SendAsync(httpRequestMessage);
    }
}
