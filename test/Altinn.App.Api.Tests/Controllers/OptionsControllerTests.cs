using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers
{
    public class OptionsControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly ITestOutputHelper _testOutput;

        public OptionsControllerTests(ITestOutputHelper testOutput, WebApplicationFactory<Program> factory) : base(factory)
        {
            _testOutput = testOutput;
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

            string url = $"/{org}/{app}/api/options/test?language=esperanto";
            HttpResponseMessage response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            _testOutput.WriteLine(content);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            headerValue.Should().Contain("lang=esperanto");
        }

        [Fact]
        public async Task Get_ShouldNotDefaultToNbLanguage()
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
            var content = await response.Content.ReadAsStringAsync();
            _testOutput.WriteLine(content);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            headerValue.Should().NotContain("nb");
        }

        [Fact]
        public async Task Get_ShouldWorkWithFileSource()
        {
            string org = "tdd";
            string app = "contributer-restriction";
            HttpClient client = GetRootedClient(org, app);

            string url = $"/{org}/{app}/api/options/fileSourceOptions";
            HttpResponseMessage response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            _testOutput.WriteLine(content);
            response.Should().HaveStatusCode(HttpStatusCode.OK);
            content.Should()
                .Be(
                    """[{"value":null,"label":""},{"value":"string-value","label":"string-label"},{"value":3,"label":"number"},{"value":true,"label":"boolean-true"},{"value":false,"label":"boolean-false"}]""");

        }

        [Fact]
        public async Task GetNonExistentList_Return404()
        {
            string org = "tdd";
            string app = "contributer-restriction";
            HttpClient client = GetRootedClient(org, app);

            string url = $"/{org}/{app}/api/options/non-existent-option-list";
            HttpResponseMessage response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            _testOutput.WriteLine(content);
            response.Should().HaveStatusCode(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Get_ShouldSerializeToCorrectTypes()
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
            var content = await response.Content.ReadAsStringAsync();
            _testOutput.WriteLine(content);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            content.Should().Be("[{\"value\":null,\"label\":\"\"},{\"value\":\"SomeString\",\"label\":\"False\"},{\"value\":true,\"label\":\"True\"},{\"value\":0,\"label\":\"Zero\"},{\"value\":1,\"label\":\"One\",\"description\":\"This is a description\",\"helpText\":\"This is a help text\"}]");
        }
    }

    public class DummyProvider : IAppOptionsProvider
    {
        public string Id => "test";

        public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            AppOptions appOptions = new AppOptions()
            {
                Parameters = new()
                {
                    { "lang", language }
                },
                Options = new List<AppOption>()
                {
                    new()
                    {
                        Value  = null,
                        Label = "",
                    },
                    new ()
                    {
                        Value = "SomeString",
                        Label = "False",
                    },
                    new ()
                    {
                        Value = "true",
                        ValueType = AppOptionValueType.Boolean,
                        Label = "True",
                    },
                    new ()
                    {
                        Value = "0",
                        ValueType = AppOptionValueType.Number,
                        Label = "Zero",
                    },
                    new ()
                    {
                        Value = "1",
                        ValueType = AppOptionValueType.Number,
                        Label = "One",
                        Description = "This is a description",
                        HelpText = "This is a help text"
                    },
                }
            };

            return Task.FromResult(appOptions);
        }
    }
}
