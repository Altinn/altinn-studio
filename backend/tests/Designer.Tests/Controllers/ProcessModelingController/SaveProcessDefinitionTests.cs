﻿using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
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
    public class SaveProcessDefinitionTests : DesignerEndpointsTestsBase<SaveProcessDefinitionTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition";

        public SaveProcessDefinitionTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "App/config/process/process.bpmn")]
        public async Task SaveProcessDefinition_ShouldReturnOk(string org, string app, string developer, string bpmnFilePath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string fileContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);

            string url = VersionPrefix(org, targetRepository);
            using var content = new StringContent(fileContent, Encoding.UTF8, MediaTypeNames.Application.Xml);

            using var response = await HttpClient.PutAsync(url, content);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/process/process.bpmn");

            XDocument expectedXml = XDocument.Parse(fileContent);
            XDocument savedXml = XDocument.Parse(savedFile);
            XNode.DeepEquals(savedXml, expectedXml).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", @"{""test"": ""test""}")]
        public async Task InvalidXml_ShouldReturnBadRequest(string org, string app, string developer, string nonXmlContent)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository);
            using var content = new StringContent(nonXmlContent, Encoding.UTF8, MediaTypeNames.Application.Xml);

            using var response = await HttpClient.PutAsync(url, content);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
