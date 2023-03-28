using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class AppDevelopmentControllerTests : ApiTestsBase<AppDevelopmentController, AppDevelopmentControllerTests>, IDisposable
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        private string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public AppDevelopmentControllerTests(WebApplicationFactory<AppDevelopmentController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "App/ui/layouts/layoutFile1.json", "App/ui/layouts/layoutFile2.json")]
        public async Task GetAppDevelopment_ReturnsAppDevelopment(string org, string app, string developer, params string[] expectedLayoutPaths)
        {

            string url = $"{VersionPrefix(org, app)}/form-layouts";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonNode.Parse(responseContent);

            foreach (string layoutPath in expectedLayoutPaths)
            {
                string expectedLayout = TestDataHelper.GetFileFromRepo(org, app, developer, layoutPath);
                string actualLayout = responseJson[Path.GetFileNameWithoutExtension(layoutPath)].ToJsonString();
                JsonAssertionUtils.DeepEquals(expectedLayout, actualLayout).Should().BeTrue();
            }


        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "testLayout", "TestData/FormLayout/layoutWithUnknownProperties.json")]
        public async Task SaveFormLayout_ReturnsOk(string org, string app, string developer, string layoutName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(layout, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
