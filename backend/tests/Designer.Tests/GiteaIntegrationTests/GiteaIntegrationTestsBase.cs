using System.IO;
using System.Net.Http;
using System.Text;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests
{
    [Collection(nameof(GiteaCollection))]
    public abstract class GiteaIntegrationTestsBase<TController, TControllerTest> : ApiTestsBase<TController, TControllerTest>
        where TController : ControllerBase
        where TControllerTest : class
    {
        protected readonly GiteaFixture GiteaFixture;

        protected override void ConfigureTestServices(IServiceCollection services)
        {

        }

        protected GiteaIntegrationTestsBase(WebApplicationFactory<TController> factory, GiteaFixture giteaFixture) : base(factory)
        {
            GiteaFixture = giteaFixture;
        }

        protected override HttpClient GetTestClient()
        {
            string configPath = GetConfigPath();

            var client = Factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile(configPath);
                    conf.AddJsonStream(GenerateGiteaOverrideConfigStream());
                });

                builder.ConfigureTestServices(ConfigureTestServices);
            }).CreateDefaultClient(new GiteaAuthDelegatingHandler(GiteaFixture.GiteaUrl), new CookieContainerHandler());
            return client;
        }

        private Stream GenerateGiteaOverrideConfigStream()
        {
            string configOverride = $@"
              {{
                    ""ServiceRepositorySettings"": {{
                        ""RepositoryLocation"": ""{SymbolDisplay.FormatLiteral(TestRepositoriesLocation, false)}"",
                        ""ApiEndPointHost"": ""localhost"",
                        ""GiteaLoginUrl"": ""{GiteaFixture.GiteaUrl + "user/login"}"",
                        ""ApiEndPoint"": ""{GiteaFixture.GiteaUrl + "api/v1/"}"",
                        ""RepositoryBaseURL"": ""{GiteaFixture.GiteaUrl[..^1]}""
                    }}
              }}
            ";
            var configStream = new MemoryStream(Encoding.UTF8.GetBytes(configOverride));
            configStream.Seek(0, SeekOrigin.Begin);
            return configStream;
        }
    }
}
