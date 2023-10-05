using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetVersionOfTheAppLibTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.AppDevelopmentController, GetVersionOfTheAppLibTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development/app-lib-version";
        public GetVersionOfTheAppLibTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "7.4.0", "Templates/AppCsprojTemplate.txt")]
        public async Task GetAppLibVersion_GivenCsProjFile_ShouldReturnOK(string org, string app, string developer, string version, string csprojTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            Dictionary<string,string> replacements = new Dictionary<string, string>() { { "[[appLibVersion]]", version } };
            await AddCsProjToRepo("App/App.csproj", csprojTemplate, replacements);

            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.Value.GetAsync(url);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var responseVersion = await response.Content.ReadAsAsync<VersionResponse>();

            responseVersion.Version.ToString().Should().Be(version);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "Templates/AppCsprojTemplateWithoutAppLib.txt")]
        public async Task GetAppLibVersion_GivenCsprojFileWithoutAppLib_ShouldReturn404(string org, string app, string developer, string csprojTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            await AddCsProjToRepo("App/App.csproj", csprojTemplate);
            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.Value.GetAsync(url);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ttd", "empty-app")]
        public async Task GetAppLibVersion_NotGivenCsprojFile_ShouldReturn404(string org, string app)
        {
            string url = VersionPrefix(org, app);

            using var response = await HttpClient.Value.GetAsync(url);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        private async Task AddCsProjToRepo(string relativeCopyRepoLocation, string csprojTemplate, Dictionary<string, string> replacements = null)
        {
            string fileContent = TestDataHelper.LoadTestDataFromFileAsString(csprojTemplate);
            if (replacements is not null)
            {
                foreach ((string key, string value) in replacements)
                {
                    fileContent = fileContent.Replace(key, value);
                }
            }

            string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
            string folderPath = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath!);
            }
            await File.WriteAllTextAsync(filePath, fileContent);
        }
    }
}
