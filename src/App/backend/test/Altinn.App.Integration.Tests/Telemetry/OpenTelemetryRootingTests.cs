using System.Net.Http.Json;
using TestApp.Shared;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Telemetry;

[Trait("Category", "Integration")]
public sealed class OpenTelemetryRootingTests(ITestOutputHelper _output)
{
    private const string IncomingTraceId = "ac256066b49c4cb79dc4b83b9616f73c";
    private const string IncomingParentSpanId = "cca043edb2398eb2";

    [Theory]
    [InlineData("01")]
    [InlineData("00")]
    public async Task AppRequests_Are_Root_Traces_When_Incoming_TraceContext_Is_Present(string traceFlags)
    {
        await using var fixture = await AppFixture.Create(
            _output,
            TestApps.Basic,
            scenario: "open-telemetry-parent-based-sampler",
            environmentVariables: new Dictionary<string, string>
            {
                ["AppSettings__UseOpenTelemetry"] = "true",
                ["GeneralSettings__IsTest"] = "true",
            }
        );

        var endpoint = $"/ttd/{fixture.EffectiveApp}/api/testing/telemetry/current-activity";
        using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
        request.Headers.TryAddWithoutValidation(
            "traceparent",
            $"00-{IncomingTraceId}-{IncomingParentSpanId}-{traceFlags}"
        );

        using var response = await fixture.GetDirectAppClient().SendAsync(request);
        response.EnsureSuccessStatusCode();

        var activity = await response.Content.ReadFromJsonAsync<CurrentActivityResult>();

        var snapshot = new
        {
            TraceId = activity?.TraceId == IncomingTraceId ? activity.TraceId : "<new trace id>",
            SpanId = activity?.SpanId is null ? null : "<span id>",
            activity?.ParentSpanId,
            ParentId = activity?.ParentId ?? "<null>",
            activity?.Recorded,
            activity?.IsAllDataRequested,
        };
        await fixture.ScopedVerifier.Verify(snapshot, parameters: new { traceFlags });
    }
}
