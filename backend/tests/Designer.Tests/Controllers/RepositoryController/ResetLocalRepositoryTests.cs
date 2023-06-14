using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class ResetLocalRepositoryTests : RepositoryControllerTestsBase<ResetLocalRepositoryTests>
    {
        public ResetLocalRepositoryTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositoryController> factory) : base(factory)
        {
        }

        // Do not use mocked repository
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient<ISourceControl, ISourceControlMock>();
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser")]
        public async Task ResetRepo_Returns200(string org, string repo, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, repo, developer, targetRepository);
            CreatedSecondaryFolderPath = await TestDataHelper.CopyRemoteRepositoryForTest(org, repo, targetRepository);

            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{targetRepository}/reset";

            // Act
            using HttpResponseMessage res = await HttpClient.Value.GetAsync(uri);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
