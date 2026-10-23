using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.LayoutController;

/// <summary>
/// The PDF page is named by pdfLayoutName in Settings.json and is in neither the page order nor a page
/// group. These tests pin that deleting it removes its layout file and that name, and leaves the pages
/// of the layout set as they were, whether the layout set uses a page order or page groups.
/// </summary>
public class DeletePageTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<DeletePageTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string PdfPageId = "PdfPage";

    [Theory]
    [InlineData("app-with-layoutsets-v9", "Task_1", "order")]
    [InlineData("app-with-groups-and-task-navigation", "form", "groups")]
    public async Task DeletePage_WhenPageIsThePdfPage_DeletesItsLayoutFileAndPdfLayoutName(
        string repository,
        string layoutSetName,
        string pagesPropertyName
    )
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repository, Developer, targetRepository);
        JsonNode pagesBefore = ReadPages(targetRepository, layoutSetName)[pagesPropertyName].DeepClone();
        AddPdfPage(targetRepository, layoutSetName);

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(
            $"/designer/api/{Org}/{targetRepository}/layouts/layoutSet/{layoutSetName}/pages/{PdfPageId}"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(File.Exists(PdfLayoutFilePath(targetRepository, layoutSetName)));
        JsonObject pagesAfter = ReadPages(targetRepository, layoutSetName);
        Assert.False(pagesAfter.ContainsKey("pdfLayoutName"));
        Assert.True(JsonNode.DeepEquals(pagesBefore, pagesAfter[pagesPropertyName]));
    }

    /// <summary>
    /// Writes a PDF page into the layout set the way Designer leaves it: a layout file, and its name as
    /// pdfLayoutName in Settings.json, outside the page order and the page groups.
    /// </summary>
    /// <param name="repository">The repository to write the page into.</param>
    /// <param name="layoutSetName">The name of the layout set to write the page into.</param>
    private static void AddPdfPage(string repository, string layoutSetName)
    {
        JsonObject layout = new() { ["data"] = new JsonObject { ["layout"] = new JsonArray() } };
        File.WriteAllText(PdfLayoutFilePath(repository, layoutSetName), layout.ToJsonString());

        string settingsPath = SettingsFilePath(repository, layoutSetName);
        JsonObject settings = JsonNode.Parse(File.ReadAllText(settingsPath)).AsObject();
        settings["pages"]["pdfLayoutName"] = PdfPageId;
        File.WriteAllText(settingsPath, settings.ToJsonString());
    }

    private static JsonObject ReadPages(string repository, string layoutSetName) =>
        JsonNode.Parse(File.ReadAllText(SettingsFilePath(repository, layoutSetName)))["pages"].AsObject();

    private static string PdfLayoutFilePath(string repository, string layoutSetName) =>
        Path.Combine(LayoutSetDirectory(repository, layoutSetName), "layouts", $"{PdfPageId}.json");

    private static string SettingsFilePath(string repository, string layoutSetName) =>
        Path.Combine(LayoutSetDirectory(repository, layoutSetName), "Settings.json");

    private static string LayoutSetDirectory(string repository, string layoutSetName) =>
        Path.Combine(
            TestDataHelper.GetTestDataRepositoryDirectory(Org, repository, Developer),
            "App",
            "ui",
            layoutSetName
        );
}
