using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Authentication.Tests.Utils;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Moq;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Controllers
{
    public class IntrospectionControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private WebApplicationFactory<Startup> _factory;
        private readonly Mock<IEFormidlingAccessValidator> _eformidlingValidatorService;
        private string _baseUrl = "/authentication/api/v1/introspection";

        /// <summary>
        /// Initialises a new instance of the <see cref="IntrospectionControllerTest"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>   
        public IntrospectionControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _eformidlingValidatorService = new Mock<IEFormidlingAccessValidator>();
        }

        /// <summary>
        /// Scenario : Endpoint called with token hint `eFormidlingAccessToken`
        /// Expected : EFormidling validator service's validate method is called. 
        /// Success Result: 200 status code, and response object from service returned.
        /// </summary>
        [Fact]
        public async Task ValidateToken_TokenHintEFormidling_EFormidlingServiceCalled()
        {
            // Arrange
            IntrospectionResponse expected = new()
            {
                Active = true,
                Iss = "digdir"
            };

            _eformidlingValidatorService.Setup(efvs => efvs.ValidateToken(It.IsAny<string>())).ReturnsAsync(new IntrospectionResponse
            {
                Active = true,
                Iss = "digdir"
            });

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, _baseUrl)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>()
                {
                    { "Token", "thisIsMyRandomToken" },
                    { "TokenTypeHint", "eFormidlingAccessToken" }
                }),
            };

            requestMessage.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            HttpClient client = GetTestClient(_eformidlingValidatorService.Object);

            // Act
            HttpResponseMessage res = await client.SendAsync(requestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            IntrospectionResponse actual = JsonSerializer.Deserialize<IntrospectionResponse>(responseString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            AssertUtil.Equal(expected, actual);
            _eformidlingValidatorService.Verify(efvs => efvs.ValidateToken(It.IsAny<string>()), Times.Once());
        }

        /// <summary>
        /// Scenario : Endpoint called without a token hint and with an invalid token.
        /// Expected : All available validators are called until a match is met, or all have been tested. 
        /// Success Result: 200 status code, and a false active response is returned.
        /// </summary>
        [Fact]
        public async Task ValidateToken_TokenHintNone_EFormidlingServiceCalled()
        {
            // Arrange        
            _eformidlingValidatorService.Setup(efvs => efvs.ValidateToken(It.IsAny<string>())).ReturnsAsync(new IntrospectionResponse
            {
                Active = false,
            });

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, _baseUrl)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>()
                {
                    { "Token", "thisIsMyRandomToken" },
                    { "TokenTypeHint", "eFormidlingAccessToken" }
                }),
            };

            requestMessage.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            HttpClient client = GetTestClient(_eformidlingValidatorService.Object);

            // Act
            HttpResponseMessage res = await client.SendAsync(requestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            IntrospectionResponse actual = JsonSerializer.Deserialize<IntrospectionResponse>(responseString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.False(actual.Active);
            _eformidlingValidatorService.Verify(efvs => efvs.ValidateToken(It.IsAny<string>()), Times.Once());
        }

        private HttpClient GetTestClient(IEFormidlingAccessValidator eFormidlingAccessValidatorMock)
        {
            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(eFormidlingAccessValidatorMock);
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            return client;
        }
    }
}
