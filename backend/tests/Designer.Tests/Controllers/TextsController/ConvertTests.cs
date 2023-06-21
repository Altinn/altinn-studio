using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextsController
{
    public class ConvertTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.TextsController, ConvertTests>
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/texts";
        public ConvertTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextsController> factory) : base(factory)
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
            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
