using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class Xacml30ConformanceTests : IClassFixture<CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup>>
    {
       private readonly CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup>
            _factory;

        public Xacml30ConformanceTests(CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task PDP_Decision_IIA001()
        {
            string testCase = "IIA001";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = TestSetupUtil.CreateXacmlRequest(testCase);
            XacmlContextResponse expected = TestSetupUtil.ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await TestSetupUtil.GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_IIA002()
        {
            string testCase = "IIA002";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = TestSetupUtil.CreateXacmlRequest(testCase);
            XacmlContextResponse expected = TestSetupUtil.ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await TestSetupUtil.GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_IIA003()
        {
            string testCase = "IIA003";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = TestSetupUtil.CreateXacmlRequest(testCase);
            XacmlContextResponse expected = TestSetupUtil.ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await TestSetupUtil.GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_IIA004()
        {
            string testCase = "IIA004";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = TestSetupUtil.CreateXacmlRequest(testCase);
            XacmlContextResponse expected = TestSetupUtil.ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await TestSetupUtil.GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_IIA005()
        {
            string testCase = "IIA005";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = TestSetupUtil.CreateXacmlRequest(testCase);
            XacmlContextResponse expected = TestSetupUtil.ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await TestSetupUtil.GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }


        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddScoped<IContextHandler, IntegrationTests.MockServices.ContextHandler>();
                    services.AddScoped<IPolicyRetrievalPoint, IntegrationTests.MockServices.PolicyRetrievalPoint>();
                });
            })
            .CreateClient();

            return client;
        }
          
  
    }
}
