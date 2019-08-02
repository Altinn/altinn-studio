using Microsoft.AspNetCore.Mvc.Testing;
using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class SimpleDecisionTests : IClassFixture<WebApplicationFactory<Altinn.Platform.Authorization.Startup>>
    {
        private readonly WebApplicationFactory<Altinn.Platform.Authorization.Startup> _factory;

        public SimpleDecisionTests(WebApplicationFactory<Altinn.Platform.Authorization.Startup> factory)
        {
            _factory = factory;
        }


        [Fact]
        public async Task Test1()
        {
            // Arrange
            HttpClient client = _factory.CreateClient(
                new WebApplicationFactoryClientOptions
                {
                    AllowAutoRedirect = false
                });

            // Act
            HttpResponseMessage response = await client.GetAsync("/api/Decision");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
