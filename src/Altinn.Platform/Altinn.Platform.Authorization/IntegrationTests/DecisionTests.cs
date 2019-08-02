using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class DecisionTests : IClassFixture<CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup>>
    {
       private readonly CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup>
            _factory;

        public DecisionTests(CustomWebApplicationFactory<Altinn.Platform.Authorization.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task PDP_Decision_AltinnApps0001()
        {
            string testCase = "AltinnApps0001";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = CreateXacmlRequest(testCase);
            XacmlContextResponse expected = ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await GetXacmlContextResponseAsync(client, httpRequestMessage);
            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_AltinnApps0002()
        {
            string testCase = "AltinnApps0002";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = CreateXacmlRequest(testCase);
            XacmlContextResponse expected = ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await GetXacmlContextResponseAsync(client, httpRequestMessage);

            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }

        [Fact]
        public async Task PDP_Decision_AltinnApps0003()
        {
            string testCase = "AltinnApps0003";
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = CreateXacmlRequest(testCase);
            XacmlContextResponse expected = ReadExpectedResponse(testCase);

            // Act
            XacmlContextResponse contextResponse = await GetXacmlContextResponseAsync(client, httpRequestMessage);

            // Assert
            AssertionUtil.AssertEqual(expected, contextResponse);
        }



        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
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

        private HttpRequestMessage CreateXacmlRequest(string testcase)
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(Path.Combine(GetAltinnAppsPath(), "AltinnApps0001Request.xml"));

            HttpRequestMessage message = new HttpRequestMessage(HttpMethod.Post, "/api/Decision")
            {
                Content = new StringContent(policyDocument.OuterXml, Encoding.UTF8, "application/xml")
            };
            message.Headers.Add("testcase", testcase);

            return message;
        }

        private async Task<XacmlContextResponse> GetXacmlContextResponseAsync(HttpClient client, HttpRequestMessage httpRequestMessage)
        {
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
      
            XacmlContextResponse contextResponse;

            using (XmlReader reader2 = XmlReader.Create(new StringReader(responseContent)))
            {
                contextResponse = XacmlParser.ReadContextResponse(reader2);
            }

            return contextResponse;
        }

        private XacmlContextResponse ReadExpectedResponse(string testCase)
        {
              return XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
        }
    }
}
