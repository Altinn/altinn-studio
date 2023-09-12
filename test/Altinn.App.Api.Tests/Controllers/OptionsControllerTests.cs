using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using Xunit;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Controllers
{
    public class OptionsControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
    {
        public OptionsControllerTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ShouldReturnParametersInHeader()
        {
            OverrideServicesForThisTest = (services) =>
            {
                services.AddTransient<IAppOptionsProvider, DummyProvider>();
            };

            string org = "tdd";
            string app = "contributer-restriction";
            HttpClient client = GetRootedClient(org, app);

            string url = $"/{org}/{app}/api/options/test";
            HttpResponseMessage response = await client.GetAsync(url);

            var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            headerValue.Should().Contain("lang=nb");
        }
    }

    public class DummyProvider : IAppOptionsProvider
    {
        public string Id => "test";

        public Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            AppOptions appOptions = new AppOptions()
            {
                Parameters = new Dictionary<string, string>()
                {
                    { "lang", "nb" }
                }
            };

            return Task.FromResult(appOptions);
        }
    }
}
