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
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveRuleHandlerTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        private Mock<ISourceControl> _sourceControlMock;

        public SaveRuleHandlerTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
            _sourceControlMock = new Mock<ISourceControl>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => _sourceControlMock.Object);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/changename/RuleHandler.js", true)]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/group/RuleHandler.js", true)]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/likert/RuleHandler.js")]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/message/RuleHandler.js")]
        public async Task SaveRuleHandler_ShouldCreateRuleHandlerFile_AndReturnNoContent(string org, string app, string developer, string expectedRuleLayoutPath, bool stageFile = false)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string content = SharedResourcesHelper.LoadTestDataAsString(expectedRuleLayoutPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler?stageFile={stageFile}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(content, Encoding.UTF8)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);

            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/RuleHandler.js").Should().BeEquivalentTo(content);
            _sourceControlMock.Verify(x => x.StageChange(org, targetRepository, "RuleHandler.js"), stageFile ? Times.Once() : Times.Never());
        }

    }
}
