using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveRuleHandlerTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {

        public SaveRuleHandlerTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/likert/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/message/RuleHandler.js")]
        public async Task SaveRuleHandler_ShouldCreateRuleHandlerFile_AndReturnNoContent(string org, string app, string developer, string layoutSetName, string expectedRuleHandlerPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string content = SharedResourcesHelper.LoadTestDataAsString(expectedRuleHandlerPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(content, Encoding.UTF8)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? "App/ui/RuleHandler.js"
                : $"App/ui/{layoutSetName}/RuleHandler.js";
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath).Should().BeEquivalentTo(content);
        }

    }
}
