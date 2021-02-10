using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;

using Designer.Tests.Mocks;
using Designer.Tests.Utils;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Xunit;

namespace Designer.Tests.TestingControllers
{
    public class SessionControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1/session";

        public SessionControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async void GetRemainingSessionTime_Ok()
        {
            // Arrange
            string uri = $"{_versionPrefix}/remaining";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            HttpClient client = GetTestClient();

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseString = await response.Content.ReadAsStringAsync();
            int remainingTime = int.Parse(responseString);

            // Assert          
            Assert.True(remainingTime == 194);
        }

        [Fact]
        public async void KeepAlive_SessionIsExtended()
        {
            // Arrange
            string uri = $"{_versionPrefix}/keepalive";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri)
            {
            };
            HttpClient client = GetTestClient();

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IGitea, IGiteaMock>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}
