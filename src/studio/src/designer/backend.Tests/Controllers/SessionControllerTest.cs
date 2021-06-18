using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;

using Designer.Tests.Mocks;
using Designer.Tests.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

using Moq;

using Xunit;

namespace Designer.Tests.TestingControllers
{
    public class SessionControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1/session";
        private readonly Mock<IHttpContextAccessor> _contextAccessorMock = new Mock<IHttpContextAccessor>();
        private readonly IOptions<GeneralSettings> _generalSettings;
        private SessionController _controller;

        public SessionControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _generalSettings = Options.Create(new GeneralSettings { SessionTimeoutCookieName = "timeoutCookie" });
        }

        [Fact]
        public async Task GetRemainingSessionTime_Ok()
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
        public void GetRemainingSessionTime_NoCookie()
        {
            DefaultHttpContext context = new DefaultHttpContext();
            _contextAccessorMock.Setup(m => m.HttpContext).Returns(context);
            _controller = new SessionController(_contextAccessorMock.Object, _generalSettings);

            int actual = _controller.GetRemainingSessionTime();

            Assert.Equal(-1, actual);
        }

        [Fact]
        public async Task KeepAlive_SessionIsExtended()
        {
            // Arrange
            string uri = $"{_versionPrefix}/keepalive";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);
            HttpClient client = GetTestClient();

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task KeepAlive_NoTimeoutCookie()
        {
            DefaultHttpContext context = new DefaultHttpContext();
            _contextAccessorMock.Setup(m => m.HttpContext).Returns(context);
            _controller = new SessionController(_contextAccessorMock.Object, _generalSettings);

            // Act
            ActionResult actual = await _controller.KeepAlive();

            // Assert
            Assert.IsType<UnauthorizedResult>(actual);
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
