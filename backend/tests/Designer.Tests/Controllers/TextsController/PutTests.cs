﻿using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextsController
{
    public class PutTests : DesignerEndpointsTestsBase<PutTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        protected static string VersionPrefix(string org, string repository) => $"/api/{org}/{repository}/texts";
        public PutTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "testUser", "nb")]
        public async Task Put_UpdateNbTexts_200OK(string org, string app, string developer, string lang)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new
            {
                new_key_1 = "new_value_1",
                new_key_2 = "new_value_2"
            });

            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "markdown-files", "testUser", "nb")]
        public async Task Put_Markdown_200OK(string org, string app, string developer, string lang)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new
            {
                markdown_key = "## This is a markdown text \n\n Here is a list \n - Item1 \n - Item2 \n - Item3 \n\n # HERE IS SOME IMPORTANT CODE \n `print(Hello world)`"
            });

            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "testUser", "nb")]
        public async Task Put_UpdateInvalidFormat_400BadRequest(string org, string app, string developer, string lang)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new
            {
                valid_key = "valid_value",
                invalid_key = new
                {
                    invalid_format = "invalid_format"
                }
            });

            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
            Assert.Equal("The texts file, nb.texts.json, that you are trying to add have invalid format.", responseDocument.RootElement.ToString());
        }

    }
}
