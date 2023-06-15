using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.SessionController
{
    public class GetRemainingSessionTimeTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.SessionController, GetRemainingSessionTimeTests>
    {
        private static string VersionPrefix => "/designer/api/session";
        public GetRemainingSessionTimeTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.SessionController> factory) : base(factory)
        {
        }

        private readonly GeneralSettings _testGeneralSettings = new GeneralSettings();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => _testGeneralSettings);
        }

        [Fact]
        public async Task GetRemainingSessionTime_Ok()
        {
            _testGeneralSettings.SessionDurationInMinutes = 200;
            // Arrange
            string uri = $"{VersionPrefix}/remaining";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseString = await response.Content.ReadAsStringAsync();
            int remainingTime = int.Parse(responseString);

            // Assert
            Assert.True(remainingTime == 194);
        }

        [Fact]
        public async Task GetRemainingSessionTime_ExpiredCookie()
        {
            _testGeneralSettings.SessionDurationInMinutes = 5;
            // Arrange
            string uri = $"{VersionPrefix}/remaining";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseString = await response.Content.ReadAsStringAsync();
            int remainingTime = int.Parse(responseString);

            // Assert
            Assert.True(remainingTime == -1);
        }

        // For simplicity of setup of cookie, we're using the controller directly instead of HttpClient
        [Fact]
        public void GetRemainingSessionTime_NoCookie()
        {
            var context = new DefaultHttpContext();
            var contextAccessorMock = new Mock<IHttpContextAccessor>();
            contextAccessorMock.Setup(m => m.HttpContext).Returns(context);
            var controller = new Altinn.Studio.Designer.Controllers.SessionController(contextAccessorMock.Object, _testGeneralSettings);

            int actual = controller.GetRemainingSessionTime();

            Assert.Equal(-1, actual);
        }

    }
}
