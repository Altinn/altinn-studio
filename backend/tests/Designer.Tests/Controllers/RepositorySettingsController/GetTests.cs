using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.RepositorySettingsController
{
    public class GetTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.RepositorySettingsController, GetTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/repository-settings";
        public GetTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositorySettingsController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "xyz-datamodels")]
        public async Task Get_RepositorySettings_ShouldReturnOk(string org, string repo)
        {
            string requestUrl = VersionPrefix(org, repo);
            using HttpResponseMessage response = await HttpClient.Value.GetAsync(requestUrl);
            var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
        }

        [Theory]
        [InlineData("ttd", "thisDoesNotExist-datamodels")]
        public async Task Get_RepositoryDoesNotExists_ShouldReturnNotFound(string org, string repo)
        {
            string requestUrl = VersionPrefix(org, repo);
            using HttpResponseMessage response = await HttpClient.Value.GetAsync(requestUrl);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

    }
}
