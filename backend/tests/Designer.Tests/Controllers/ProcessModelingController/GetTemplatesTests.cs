﻿using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class GetTemplatesTests : DesignerEndpointsTestsBase<GetTemplatesTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository, string appVersion) => $"/designer/api/{org}/{repository}/process-modelling/templates/{appVersion}";

        public GetTemplatesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "8.0.0", "start-data-confirmation-end.bpmn", "start-data-confirmation-feedback-end.bpmn", "start-data-end.bpmn", "start-data-signing-end.bpmn")]
        [InlineData("ttd", "empty-app", "8.0.0-preview.11", "start-data-confirmation-end.bpmn", "start-data-confirmation-feedback-end.bpmn", "start-data-end.bpmn", "start-data-signing-end.bpmn")]
        [InlineData("ttd", "empty-app", "7.4.0", "start-data-confirmation-end.bpmn", "start-data-data-data-end.bpmn", "start-data-end.bpmn")]
        [InlineData("ttd", "empty-app", "6.1.0")]
        public async Task GetTemplates_ShouldReturnOK(string org, string app, string version, params string[] expectedTemplates)
        {
            string url = VersionPrefix(org, app, version);

            using var response = await HttpClient.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

            Assert.Equal(expectedTemplates.Length, responseContent.Count);
            foreach (string expectedTemplate in expectedTemplates)
            {
                Assert.Contains(expectedTemplate, responseContent);
            }
        }
    }
}
