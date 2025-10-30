#nullable disable
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetAppVersionTests : DesignerEndpointsTestsBase<GetAppVersionTests>,
        IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development/app-version";

        public GetAppVersionTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "7.4.0", "3.1.12", "Templates/AppCsprojTemplate.txt", "Templates/Index.cshtml.txt")]
        [InlineData("ttd", "empty-app", "testUser", "7.4.0", "3.1", "Templates/AppCsprojTemplate.txt", "Templates/Index.cshtml.txt")]
        [InlineData("ttd", "empty-app", "testUser", "8.0.0-preview.11", "3", "Templates/AppCsprojTemplate.txt", "Templates/Index.cshtml.txt")]
        [InlineData("ttd", "empty-app", "testUser", "6.0.0", "3.0.0-rc2", "Templates/AppCsprojTemplate.txt", "Templates/Index.cshtml.txt")]
        public async Task GetAppVersion_GivenCsProjFile_ShouldReturnOK(string org, string app, string developer,
            string backendVersion, string frontendVersion, string csprojTemplate, string indesCshtmlTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            Dictionary<string, string> replacements = new()
            {
                { "[[appLibVersion]]", backendVersion }, { "[[frontendVersion]]", frontendVersion }
            };
            await AddCsProjToRepo("App/App.csproj", csprojTemplate, replacements);
            await AddFrontendIndexToRepo("App/views/Home/Index.cshtml", indesCshtmlTemplate, replacements);

            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var responseVersion = await response.Content.ReadAsAsync<VersionResponse>();

            Assert.Equal(backendVersion, responseVersion.BackendVersion.ToString());
            Assert.Equal(frontendVersion, responseVersion.FrontendVersion);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "Templates/AppCsprojTemplateWithoutAppLib.txt")]
        public async Task GetAppVersion_GivenCsprojFileWithoutAppLib_ShouldReturn404(string org, string app,
            string developer, string csprojTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            await AddCsProjToRepo("App/App.csproj", csprojTemplate);
            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "empty-app")]
        public async Task GetAppVersion_NotGivenCsprojFile_ShouldReturn404(string org, string app)
        {
            string url = VersionPrefix(org, app);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "7.4.0", "Templates/AppCsprojTemplate.txt")]
        public async Task GetAppVersion_NotGivenIndexFile_ShouldReturnNullAsVersion(string org, string app, string developer, string backendVersion, string csprojTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            await AddCsProjToRepo("App/App.csproj", csprojTemplate,
                new Dictionary<string, string>() { { "[[appLibVersion]]", backendVersion } });
            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var responseVersion = await response.Content.ReadAsAsync<VersionResponse>();
            Assert.Null(responseVersion.FrontendVersion);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "8.0.0-preview.11", "Templates/AppCsprojTemplate.txt", "Templates/IndexWithoutFrontendVersion.cshtml.txt")]
        public async Task GetAppVersion_GivenIndexFileWithoutFrontendVersion_ShouldReturnNullAsVersion(string org, string app, string developer, string backendVersion, string csprojTemplate, string indesCshtmlTemplate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            await AddCsProjToRepo("App/App.csproj", csprojTemplate,
                new Dictionary<string, string>() { { "[[appLibVersion]]", backendVersion } });
            await AddFrontendIndexToRepo("App/views/Home/Index.cshtml", indesCshtmlTemplate);
            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var responseVersion = await response.Content.ReadAsAsync<VersionResponse>();
            Assert.Null(responseVersion.FrontendVersion);

        }

        private async Task AddCsProjToRepo(string relativeCopyRepoLocation, string csprojTemplate,
            Dictionary<string, string> replacements = null)
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

        private Task AddFrontendIndexToRepo(string relativeCopyRepoLocation, string indexTemplate,
            Dictionary<string, string> replacements = null)
        {
            string fileContent = TestDataHelper.LoadTestDataFromFileAsString(indexTemplate);
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

            return File.WriteAllTextAsync(filePath, fileContent);
        }
    }
}
