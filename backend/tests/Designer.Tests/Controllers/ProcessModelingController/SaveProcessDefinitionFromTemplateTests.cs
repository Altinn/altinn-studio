﻿using System.Net;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class SaveProcessDefinitionFromTemplateTests : DesignerEndpointsTestsBase<SaveProcessDefinitionFromTemplateTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        private static string VersionPrefix(string org, string repository, string appVersion, string templateName) => $"/designer/api/{org}/{repository}/process-modelling/templates/{appVersion}/{templateName}";

        public SaveProcessDefinitionFromTemplateTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "9.0.0", "start-data-confirmation-end.bpmn")]
        public async Task SaveProcessDefinitionFromTemplate_WrongTemplate_ShouldReturn404(string org, string app, string developer, string version, string templateName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository, version, templateName);

            using var response = await HttpClient.PutAsync(url, null);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "8.0.0", "start-data-confirmation-end.bpmn")]
        [InlineData("ttd", "empty-app", "testUser", "8.0.0-preview.11", "start-data-confirmation-end.bpmn")]
        public async Task SaveProcessDefinitionFromTemplate_ShouldReturnOk_AndSaveTemplate(string org, string app, string developer, string version, string templateName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository, version, templateName);

            using var response = await HttpClient.PutAsync(url, null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();

            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/process/process.bpmn");

            XDocument responseXml = XDocument.Parse(responseContent);
            XDocument savedXml = XDocument.Parse(savedFile);
            Assert.True(XNode.DeepEquals(savedXml, responseXml));
        }
    }
}
