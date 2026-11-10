using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Designer.Tests.TypedHttpClients.AltinnAuthentication;

public class AltinnAuthenticationClientTests
{
    private const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";
    private const string SubscriptionKeyTT02 = "tt02-subscription-key";
    private const string SubscriptionKeyProd = "prod-subscription-key";

    private static readonly Uri s_tt02Uri = new("https://platform.tt02.altinn.no/storage/api/v1/applications");
    private static readonly Uri s_prodUri = new("https://platform.altinn.no/storage/api/v1/applications");

    private static readonly PlatformSettings s_platformSettings = new()
    {
        ApiAuthenticationConvertUri = "authentication/api/v1/exchange/altinnstudio",
        SubscriptionKeyHeaderName = SubscriptionKeyHeaderName,
        SubscriptionKeyTT02 = SubscriptionKeyTT02,
        SubscriptionKeyProd = SubscriptionKeyProd,
    };

    [Fact]
    public async Task ConvertTokenAsync_SendsTokenAndSubscriptionKeyOnTheRequest()
    {
        var handler = new TokenEchoHandler();
        using var httpClient = new HttpClient(handler);
        var client = new AltinnAuthenticationClient(
            httpClient,
            s_platformSettings,
            NullLogger<AltinnAuthenticationClient>.Instance
        );

        string result = await client.ConvertTokenAsync("designer-token", s_tt02Uri);

        Assert.Equal("designer-token", result);
        HttpRequestMessage request = Assert.Single(handler.Requests);
        Assert.Equal(
            new Uri("https://platform.tt02.altinn.no/authentication/api/v1/exchange/altinnstudio"),
            request.RequestUri
        );
        Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
        Assert.Equal("designer-token", request.Headers.Authorization?.Parameter);
        Assert.Equal([SubscriptionKeyTT02], request.Headers.GetValues(SubscriptionKeyHeaderName));
        Assert.Null(httpClient.DefaultRequestHeaders.Authorization);
        Assert.False(httpClient.DefaultRequestHeaders.Contains(SubscriptionKeyHeaderName));
    }

    [Fact]
    public async Task ConvertTokenAsync_RepeatedCalls_SendOnlyTheirOwnSubscriptionKey()
    {
        var handler = new TokenEchoHandler();
        using var httpClient = new HttpClient(handler);
        var client = new AltinnAuthenticationClient(
            httpClient,
            s_platformSettings,
            NullLogger<AltinnAuthenticationClient>.Instance
        );

        await client.ConvertTokenAsync("first-token", s_tt02Uri);
        await client.ConvertTokenAsync("second-token", s_prodUri);

        HttpRequestMessage secondRequest = handler.Requests.Single(request =>
            request.Headers.Authorization?.Parameter == "second-token"
        );
        Assert.Equal([SubscriptionKeyProd], secondRequest.Headers.GetValues(SubscriptionKeyHeaderName));
    }

    [Fact]
    public async Task ConvertTokenAsync_ConcurrentCalls_EachSendTheirOwnToken()
    {
        const int ConcurrentCalls = 200;
        var handler = new TokenEchoHandler();
        using var httpClient = new HttpClient(handler);
        var client = new AltinnAuthenticationClient(
            httpClient,
            s_platformSettings,
            NullLogger<AltinnAuthenticationClient>.Instance
        );
        string[] tokens = Enumerable.Range(0, ConcurrentCalls).Select(index => $"token-{index}").ToArray();

        string[] results = await Task.WhenAll(
            tokens.Select(token => Task.Run(() => client.ConvertTokenAsync(token, s_tt02Uri)))
        );

        Assert.Equal(tokens, results);
        Assert.All(
            handler.Requests,
            request => Assert.Equal([SubscriptionKeyTT02], request.Headers.GetValues(SubscriptionKeyHeaderName))
        );
    }

    private sealed class TokenEchoHandler : HttpMessageHandler
    {
        public ConcurrentBag<HttpRequestMessage> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            await Task.Yield();
            Requests.Add(request);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(request.Headers.Authorization?.Parameter),
            };
        }
    }
}
