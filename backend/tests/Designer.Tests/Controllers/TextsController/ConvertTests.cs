﻿using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextsController
{
    public class ConvertTests : DesignerEndpointsTestsBase<ConvertTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        protected static string VersionPrefix(string org, string repository) => $"/api/{org}/{repository}/texts";
        public ConvertTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "convert-texts", "testUser")]
        public async Task Put_ConvertTexts_204NoContent(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/convert";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
