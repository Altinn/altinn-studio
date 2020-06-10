using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Profile;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.UnitTests.Utils;
using Newtonsoft.Json;
using Xunit;

namespace UnitTests
{
    public class HealtCheckTests : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private readonly CustomWebApplicationFactory<Startup> _factory;

        public HealtCheckTests(CustomWebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task VerifyHeltCheck_OK()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/health")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string content = await response.Content.ReadAsStringAsync();
               
        }
    }
}
