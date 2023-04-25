using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.RepositorySettingsController
{
    public class PutTests : RepositorySettingsControllerTestsBase<GetTests>
    {

        public PutTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositorySettingsController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "xyz-datamodels", "testUser")]
        public async Task Put_ValidRepositorySettings_ShouldUpdate(string org, string repo, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName("-datamodels");
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, repo, developer, targetRepository);

            string requestUrl = VersionPrefix(org, targetRepository);
            const string requestBody = @"{""repoType"": ""Datamodels"", ""datamodelling.preference"": ""JsonSchema""}";

            using var payload = new StringContent(requestBody, Encoding.UTF8, MediaTypeNames.Application.Json);

            using HttpResponseMessage response = await HttpClient.Value.PutAsync(requestUrl, payload);
            var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
        }
    }
}
