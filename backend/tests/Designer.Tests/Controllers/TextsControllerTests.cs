using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class TextsControllerTests : ApiTestsBase<TextsController, TextsControllerTests>
    {
        private readonly string _versionPrefix = "designer/api/v2";

        public TextsControllerTests(WebApplicationFactory<TextsController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Fact]
        public async Task Get_ReturnsNbTexts()
        {
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Dictionary<string, string> expectedDictionary = new Dictionary<string, string> { { "nb_key1", "nb_value1" }, { "nb_key2", "nb_value2" } };
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(expectedDictionary, responseDictionary);
        }

        [Fact]
        public async Task Get_Markdown_200Ok()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "markdown-files", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Get_NonExistingFile_404NotFound()
        {
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/texts/uk";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
            Assert.Equal("The texts file, uk.texts.json, that you are trying to find does not exist.", responseDocument.RootElement.ToString());
        }

        [Fact]
        public async Task Get_InvalidFile_500InternalServer()
        {
            string dataPathWithData = $"{_versionPrefix}/ttd/invalid-texts-format/texts/en";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Assert.Equal(StatusCodes.Status500InternalServerError, (int)response.StatusCode);
            Assert.Equal("The format of the file, en.texts.json, that you tried to access might be invalid.", responseDictionary["errorMessage"]);
        }

        [Fact]
        public async Task Put_UpdateNbTexts_200OK()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { new_key_1 = "new_value_1", new_key_2 = "new_value_2" });

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Put_Markdown_200OK()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "markdown-files", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { markdown_key = "## This is a markdown text \n\n Here is a list \n - Item1 \n - Item2 \n - Item3 \n\n # HERE IS SOME IMPORTANT CODE \n `print(Hello world)`" });

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Put_ConvertTexts_204NoContent()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "convert-texts", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/convert";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            try
            {
                Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
            }
            finally
            {
                Thread.Sleep(100);
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Put_UpdateInvalidFormat_400BadRequest()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { valid_key = "valid_value", invalid_key = new { invalid_format = "invalid_format" } });

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            try
            {
                Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
                Assert.Equal("The texts file, nb.texts.json, that you are trying to add have invalid format.", responseDocument.RootElement.ToString());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Delete_200Ok()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.Equal("Texts file, nb.texts.json, was successfully deleted.", responseDocument.RootElement.ToString());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Delete_Markdown_200Ok()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "markdown-files", "testUser", targetRepository);
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.Equal("Texts file, nb.texts.json, was successfully deleted.", responseDocument.RootElement.ToString());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }
    }
}
