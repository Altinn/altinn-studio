#nullable enable
using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using VerifyXunit;
using Xunit;

namespace Designer.Tests.Services;

public class EnvironmentsServiceTests
{
    private const string EnvironmentsJson = """
        {
          "environments": [
            {
              "platformUrl": "https://platform.at22.altinn.cloud",
              "hostname": "at22.altinn.cloud",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "at22",
              "type": "test"
            },
            {
              "platformUrl": "https://platform.at23.altinn.cloud",
              "hostname": "at23.altinn.cloud",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "at23",
              "type": "test"
            },
            {
              "platformUrl": "https://platform.at24.altinn.cloud",
              "hostname": "at24.altinn.cloud",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "at24",
              "type": "test"
            },
            {
              "platformUrl": "https://platform.yt01.altinn.cloud",
              "hostname": "yt01.altinn.cloud",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "yt01",
              "type": "test"
            },
            {
              "platformUrl": "https://platform.tt02.altinn.no",
              "hostname": "tt02.altinn.no",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "tt02",
              "type": "test"
            },
            {
              "platformUrl": "https://platform.altinn.no",
              "hostname": "altinn.no",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "production",
              "type": "production"
            }
          ]
        }
        """;

    [Theory]
    [InlineData("at22")]
    [InlineData("at23")]
    [InlineData("at24")]
    [InlineData("tt02")]
    [InlineData("yt01")]
    [InlineData("production")]
    public async Task GetAppClusterUri_ReturnsCorrectUri(string envName)
    {
        const string Org = "ttd";
        var httpClient = new HttpClient(new MockHttpMessageHandler(EnvironmentsJson))
        {
            BaseAddress = new Uri("https://mock.altinn.cloud")
        };
        var generalSettings = new GeneralSettings { EnvironmentsUrl = "https://mock.altinn.cloud/environments.json", HostName = "altinn.studio" };
        var platformSettings = new PlatformSettings { AppClusterUrlPattern = "https://{org}.{appPrefix}.{hostName}" };
        var cache = new MemoryCache(new MemoryCacheOptions());

        var sut = new EnvironmentsService(
            httpClient,
            generalSettings,
            platformSettings,
            cache,
            NullLogger<EnvironmentsService>.Instance
        );

        Uri result = await sut.GetAppClusterUri(Org, envName);

        await Verifier.Verify(result).UseParameters(envName);
    }

    private sealed class MockHttpMessageHandler(string responseContent) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseContent, Encoding.UTF8, "application/json")
            };
            return Task.FromResult(response);
        }
    }
}
