using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController;

public class SaveToRemovedLayoutSetTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<SaveToRemovedLayoutSetTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    [InlineData("form-layout/Side1", true)]
    [InlineData("layout-settings", true)]
    [InlineData("form-layout/Side1", false)]
    [InlineData("layout-settings", false)]
    public async Task Save_ToRemovedTaskFolder_RejectsWithoutRecreatingIt(string endpoint, bool renamed)
    {
        string app = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", app);
        string originalFolder = Path.Combine(TestRepoPath, "App/ui/Task_1");
        string renamedFolder = Path.Combine(TestRepoPath, "App/ui/RenamedTask");
        string originalPage = await File.ReadAllTextAsync(Path.Combine(originalFolder, "layouts/Side1.json"));
        string originalSettings = await File.ReadAllTextAsync(Path.Combine(originalFolder, "Settings.json"));
        if (renamed)
        {
            Directory.Move(originalFolder, renamedFolder);
        }
        else
        {
            Directory.Delete(originalFolder, recursive: true);
        }
        string payload =
            endpoint == "layout-settings"
                ? "{\"pages\":{\"order\":[\"Side1\"]}}"
                : "{\"layout\":{\"data\":{\"layout\":[]}}}";

        using HttpResponseMessage response = await HttpClient.PostAsync(
            $"/designer/api/ttd/{app}/app-development/{endpoint}?layoutSetName=Task_1",
            new StringContent(payload, Encoding.UTF8, MediaTypeNames.Application.Json)
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("The layout set no longer exists", await response.Content.ReadAsStringAsync());
        Assert.False(Directory.Exists(originalFolder));
        if (renamed)
        {
            Assert.Equal(originalPage, await File.ReadAllTextAsync(Path.Combine(renamedFolder, "layouts/Side1.json")));
            Assert.Equal(originalSettings, await File.ReadAllTextAsync(Path.Combine(renamedFolder, "Settings.json")));
        }
    }
}
