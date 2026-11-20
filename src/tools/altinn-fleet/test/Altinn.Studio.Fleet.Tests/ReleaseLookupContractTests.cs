using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Http;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>
/// Checks the client of Designer's release lookup against the request and response that Designer's own test checks
/// the real endpoint with, so that the two cannot drift apart.
/// </summary>
public sealed class ReleaseLookupContractTests
{
    private static readonly string s_contract = Path.Join(AppContext.BaseDirectory, "ReleaseLookupContract");

    [Fact]
    public async Task Client_SendsDesignersRequestAndReadsItsResponse()
    {
        var designer = new DesignerLookup(
            await File.ReadAllTextAsync(Path.Join(s_contract, "response.json"), TestContext.Current.CancellationToken)
        );
        using HttpClient http = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, designer);
        var resolver = new ReleaseResolver(
            http,
            new StudioKeys(new FakeCredentials("altinn.studio")),
            [new FleetOptions().StudioHosts[0]],
            4,
            TimeProvider.System
        );
        AppDeployment[] deployments =
        [
            Deployment("app-one", "1.0.0"),
            Deployment("app-two", "2.0.0-rc.1"),
            Deployment("not-released", "1"),
        ];

        Resolution resolution = await resolver.Resolve(
            deployments,
            (_, _) => { },
            TestContext.Current.CancellationToken
        );

        JsonNode expectedRequest = JsonNode.Parse(
            await File.ReadAllTextAsync(Path.Join(s_contract, "request.json"), TestContext.Current.CancellationToken)
        )!;
        Assert.True(
            JsonNode.DeepEquals(expectedRequest, JsonNode.Parse(Assert.Single(designer.Requests))),
            $"Sent {designer.Requests[0]}"
        );
        Assert.Equal(
            [
                ("app-one", "1.0.0", "1111111111111111111111111111111111111111", "2026-01-02T03:04:05.6780000+00:00"),
                (
                    "app-two",
                    "2.0.0-rc.1",
                    "2222222222222222222222222222222222222222",
                    "2026-01-02T03:04:06.6780000+00:00"
                ),
            ],
            resolution
                .Releases.Values.Select(r =>
                    (
                        r.Release.App.App.Value,
                        r.Release.Version.Value,
                        r.Release.Commit.Value,
                        r.Release.Created.ToString("O", System.Globalization.CultureInfo.InvariantCulture)
                    )
                )
                .Order()
        );
        Assert.Equal("not-released", Assert.Single(resolution.Failures).Key.App.Value);
    }

    private static AppDeployment Deployment(string app, string version) =>
        new(AppIdentifier.Parse("fleetcontract", app), RuntimeEnvironment.Production, AppVersion.Parse(version));

    private sealed class DesignerLookup(string response) : HttpMessageHandler
    {
        public List<string> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Assert.Equal("https://altinn.studio/designer/api/v1/releases/lookup", request.RequestUri?.ToString());
            Requests.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(response, Encoding.UTF8, "application/json"),
            };
        }
    }
}
