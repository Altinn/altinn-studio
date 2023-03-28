using System;
using System.Collections.Generic;
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
        [InlineData("ttd", "empty-app", "testUser",
            "TestData/FormLayout/layoutWithUnknownProperties.json",
            "TestData/FormLayout/changename/layouts/form.json",
            "TestData/FormLayout/changename/layouts/summary.json",
            "TestData/FormLayout/datalist/layouts/formLayout.json",
            "TestData/FormLayout/datalist/layouts/summary.json",
            "TestData/FormLayout/group/layouts/hide.json",
            "TestData/FormLayout/group/layouts/prefill.json",
            "TestData/FormLayout/group/layouts/repeating.json",
            "TestData/FormLayout/group/layouts/summary.json",
            "TestData/FormLayout/likert/layouts/formLayout.json",
            "TestData/FormLayout/message/layouts/formLayout.json")]
        public async Task GetAppDevelopment_ShouldReturnLayouts(string org, string app, string developer, params string[] expectedLayoutPaths)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            Dictionary<string, string> expectedLayouts = await AddLayoutsToRepo(CreatedFolderPath, expectedLayoutPaths);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layouts";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonNode.Parse(responseContent);

            foreach ((string expectedLayoutName, string expectedLayout) in expectedLayouts)
            {
                string actualLayout = responseJson[Path.GetFileNameWithoutExtension(expectedLayoutName)].ToJsonString();
                JsonAssertionUtils.DeepEquals(expectedLayout, actualLayout).Should().BeTrue();
            }
        }
        private async Task<Dictionary<string, string>> AddLayoutsToRepo(string reppPath, string[] expectedLayoutPaths)
        {
            Dictionary<string, string> expectedLayouts = new Dictionary<string, string>();
            foreach (string layoutPath in expectedLayoutPaths)
            {
                string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);
                string layoutName = $"{Guid.NewGuid()}{Path.GetFileNameWithoutExtension(layoutPath)}";
                string layoutFolder = Path.Combine(reppPath, "App", "ui", "layouts");
                Directory.CreateDirectory(layoutFolder);
                string layoutFilePath = Path.Combine(layoutFolder, $"{layoutName}.json");
                await File.WriteAllTextAsync(layoutFilePath, layout);
                expectedLayouts.Add(layoutName, layout);
            }
            return expectedLayouts;
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/changename/layouts/form.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/changename/layouts/summary.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/datalist/layouts/formLayout.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/datalist/layouts/summary.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/group/layouts/hide.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/group/layouts/prefill.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/group/layouts/repeating.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/group/layouts/summary.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/likert/layouts/formLayout.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", "TestData/FormLayout/message/layouts/formLayout.json")]
        public async Task SaveFormLayout_ReturnsOk(string org, string app, string developer, string layoutName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(layout, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string savedLayout = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/ui/layouts/{layoutName}.json");
            JsonAssertionUtils.DeepEquals(layout, savedLayout).Should().BeTrue();
        }
    }
}
