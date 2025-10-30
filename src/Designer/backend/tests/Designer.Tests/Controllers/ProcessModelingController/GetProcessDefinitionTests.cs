#nullable disable
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class GetProcessDefinitionTests : DesignerEndpointsTestsBase<GetProcessDefinitionTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition";

        public GetProcessDefinitionTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-options", "testUser", "App/config/process/process.bpmn")]
        public async Task GetProcessDefinitionTests_ShouldReturnOK(string org, string app, string developer, string bpmnFilePath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string fileContent = await AddFileToRepo(bpmnFilePath, "App/config/process/process.bpmn");

            string url = VersionPrefix(org, targetRepository);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();

            XDocument responseXml = XDocument.Parse(responseContent);
            XDocument expectedXml = XDocument.Parse(fileContent);
            Assert.True(XNode.DeepEquals(responseXml, expectedXml));
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets")]
        public async Task GetProcessDefinitionTests_If_Doesnt_Exists_ShouldReturnNotFound(string org, string app)
        {
            string url = VersionPrefix(org, app);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        private async Task<string> AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
        {
            string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
            string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
            string folderPath = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }
            await File.WriteAllTextAsync(filePath, fileContent);
            return fileContent;
        }

    }
}
