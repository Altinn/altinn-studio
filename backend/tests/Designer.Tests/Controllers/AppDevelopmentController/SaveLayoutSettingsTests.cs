using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveLayoutSettingsTests : AppDevelopmentControllerTestsBase<SaveFormLayoutTestsBase>
    {

        public SaveLayoutSettingsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        public async Task SaveLayoutSettings_ReturnsOk(string org, string app, string developer, string layoutSettingsPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-settings";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutSettingsPath);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(layout, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string savedLayout = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/ui/Settings.json");
            JsonAssertionUtils.DeepEquals(layout, savedLayout).Should().BeTrue();
        }
    }
}
