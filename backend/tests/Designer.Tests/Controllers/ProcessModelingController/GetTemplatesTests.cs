using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class GetTemplatesTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ProcessModelingController, GetTemplatesTests>
    {
        private static string VersionPrefix(string org, string repository, string appVersion) => $"/designer/api/{org}/{repository}/process-modelling/templates/{appVersion}";

        public GetTemplatesTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ProcessModelingController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "8.0.0", "start-data-confirmation-end.bpmn", "start-data-confirmation-feedback-end.bpmn", "start-data-end.bpmn", "start-data-signing-end.bpmn")]
        [InlineData("ttd", "empty-app", "7.4.0")]
        public async Task GetTemplates_ShouldReturnOK(string org, string app, string version, params string[] expectedTemplates)
        {
            string url = VersionPrefix(org, app, version);

            using var response = await HttpClient.Value.GetAsync(url);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

            responseContent.Count.Should().Be(expectedTemplates.Length);
            foreach (string expectedTemplate in expectedTemplates)
            {
                responseContent.Should().Contain(expectedTemplate);
            }
        }
    }
}
