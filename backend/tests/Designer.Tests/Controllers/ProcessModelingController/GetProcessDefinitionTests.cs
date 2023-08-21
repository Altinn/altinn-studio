using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class GetProcessDefinitionTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ProcessModelingController, GetProcessDefinitionTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition";

        public GetProcessDefinitionTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ProcessModelingController> factory) : base(factory)
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

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            XDocument responseXml = XDocument.Parse(responseContent);
            XDocument expectedXml = XDocument.Parse(fileContent);
            XNode.DeepEquals(responseXml, expectedXml).Should().BeTrue();

        }

        private async Task<string> AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
        {
            string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
            string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
            string folderPath = Path.GetDirectoryName(filePath);
            if(!Directory.Exists(folderPath)) {
                Directory.CreateDirectory(folderPath);
            }
            await File.WriteAllTextAsync(filePath, fileContent);
            return fileContent;
        }

    }
}
