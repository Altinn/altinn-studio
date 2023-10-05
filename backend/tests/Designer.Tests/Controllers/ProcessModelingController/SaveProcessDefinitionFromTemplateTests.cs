using System.Net;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class SaveProcessDefinitionFromTemplateTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ProcessModelingController, SaveProcessDefinitionFromTemplateTests>
    {

        private static string VersionPrefix(string org, string repository, string appVersion, string templateName) => $"/designer/api/{org}/{repository}/process-modelling/templates/{appVersion}/{templateName}";

        public SaveProcessDefinitionFromTemplateTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ProcessModelingController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "8.0.0", "start-data-confirmation-end.bpmn")]
        public async Task SaveProcessDefinitionFromTemplate_ShouldReturnOk_AndSaveTemplate(string org, string app, string developer, string version, string templateName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository, version, templateName);

            using var response = await HttpClient.Value.PutAsync(url, null);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/process/process.bpmn");

            XDocument responseXml = XDocument.Parse(responseContent);
            XDocument savedXml = XDocument.Parse(savedFile);
            XNode.DeepEquals(savedXml, responseXml).Should().BeTrue();
        }
    }
}
