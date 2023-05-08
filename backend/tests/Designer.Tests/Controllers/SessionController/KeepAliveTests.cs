using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.SessionController
{
    public class KeepAliveTests : SessionControllerTestsBase<KeepAliveTests>
    {

        public KeepAliveTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.SessionController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task KeepAlive_SessionIsExtended()
        {
            // Arrange
            string uri = $"{VersionPrefix}/keepalive";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        // For simplicity of setup of cookie, we're using the controller directly instead of HttpClient
        [Fact]
        public async Task KeepAlive_NoTimeoutCookie()
        {
            DefaultHttpContext context = new DefaultHttpContext();
            var contextAccessorMock = new Mock<IHttpContextAccessor>();
            contextAccessorMock.Setup(m => m.HttpContext).Returns(context);
            var controller = new Altinn.Studio.Designer.Controllers.SessionController(contextAccessorMock.Object, new GeneralSettings());

            // Act
            ActionResult actual = await controller.KeepAlive();

            // Assert
            Assert.IsType<UnauthorizedResult>(actual);
        }

    }
}
