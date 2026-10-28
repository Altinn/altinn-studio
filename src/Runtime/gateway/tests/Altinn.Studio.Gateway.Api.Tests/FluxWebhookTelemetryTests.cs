using System.Diagnostics;
using System.Net;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Endpoints.Internal;
using Altinn.Studio.Gateway.Api.Endpoints.Internal.Contracts;
using Altinn.Studio.Gateway.Api.Telemetry;
using k8s;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Each relevant Flux event is counted once in altinn.gateway.deploy_events, with error.type when Designer didn't get
/// it, and the webhook's span says the same.
/// </summary>
public sealed class FluxWebhookTelemetryTests : IDisposable
{
    private const string ServiceOwnerApp = "ttd-my-app-staging";

    private readonly MetricRecorder _metrics = new();
    private readonly ActivitySource _testSource = new("flux-webhook-telemetry-tests");
    private readonly ActivityListener _activityListener;

    public FluxWebhookTelemetryTests()
    {
        _activityListener = new ActivityListener
        {
            ShouldListenTo = source => source == _testSource,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
        };
        ActivitySource.AddActivityListener(_activityListener);
    }

    public void Dispose()
    {
        _activityListener.Dispose();
        _testSource.Dispose();
        _metrics.Dispose();
    }

    [Fact]
    public async Task DesignerGetsTheEvent_CountsItWithoutErrorTypeAndTagsTheWebhookSpan()
    {
        using var webhookSpan = StartWebhookSpan();

        await Handle(FluxEventFor(ServiceOwnerApp), HttpStatusCode.NotFound, HttpStatusCode.OK);

        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal(GatewayMetrics.DeployEventsMetricName, measurement.Name);
        Assert.Equal(
            new Dictionary<string, object?>
            {
                [ServiceTelemetry.Attributes.FluxReason] = "UpgradeSucceeded",
                [ServiceTelemetry.Attributes.OriginEnvironment] = "staging",
            },
            measurement.Tags
        );
        Assert.Equal("my-app", webhookSpan.GetTagItem(AltinnAttributes.App));
        Assert.Equal("staging", webhookSpan.GetTagItem(ServiceTelemetry.Attributes.OriginEnvironment));
        Assert.Equal(ActivityStatusCode.Unset, webhookSpan.Status);
    }

    [Fact]
    public async Task DesignerRejectsTheEvent_CountsItWithTheStatusCode()
    {
        using var webhookSpan = StartWebhookSpan();

        var result = await Handle(FluxEventFor(ServiceOwnerApp), HttpStatusCode.NotFound, HttpStatusCode.Unauthorized);

        Assert.IsType<Microsoft.AspNetCore.Http.HttpResults.Ok>(result);
        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal("401", measurement.Tags[ServiceTelemetry.Attributes.ErrorType]);
        Assert.Equal("staging", measurement.Tags[ServiceTelemetry.Attributes.OriginEnvironment]);
        Assert.Equal(ActivityStatusCode.Error, webhookSpan.Status);
        Assert.Equal("401", webhookSpan.GetTagItem(ServiceTelemetry.Attributes.ErrorType));
    }

    [Fact]
    public async Task HelmReleaseNamesNoApp_CountsItAsUnresolved()
    {
        using var webhookSpan = StartWebhookSpan();

        await Handle(FluxEventFor("not-a-release-name"), HttpStatusCode.NotFound, HttpStatusCode.OK);

        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal(
            new Dictionary<string, object?>
            {
                [ServiceTelemetry.Attributes.FluxReason] = "UpgradeSucceeded",
                [ServiceTelemetry.Attributes.ErrorType] = ServiceTelemetry.ErrorTypes.HelmReleaseUnresolved,
            },
            measurement.Tags
        );
        Assert.Equal(ActivityStatusCode.Error, webhookSpan.Status);
    }

    [Fact]
    public async Task KubernetesApiFails_CountsItWithTheExceptionTypeAndFailsTheRequest()
    {
        using var webhookSpan = StartWebhookSpan();

        await Assert.ThrowsAnyAsync<Exception>(() =>
            Handle(FluxEventFor(ServiceOwnerApp), HttpStatusCode.Forbidden, HttpStatusCode.OK)
        );

        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal("k8s.Autorest.HttpOperationException", measurement.Tags[ServiceTelemetry.Attributes.ErrorType]);
        Assert.Equal(ActivityStatusCode.Error, webhookSpan.Status);
    }

    [Fact]
    public async Task EventThatIsNoInstallUpgradeOrUninstall_IsNotCounted()
    {
        await Handle(
            FluxEventFor(ServiceOwnerApp, reason: "ReconciliationSucceeded"),
            HttpStatusCode.OK,
            HttpStatusCode.OK
        );

        Assert.Empty(_metrics.Measurements);
    }

    private async Task<IResult> Handle(
        FluxEvent fluxEvent,
        HttpStatusCode kubernetesStatus,
        HttpStatusCode designerStatus
    )
    {
        using var kubernetes = new Kubernetes(
            new KubernetesClientConfiguration { Host = "http://kubernetes.test" },
            new StubHandler(kubernetesStatus)
        );
        using var designerHandler = new StubHandler(designerStatus);
        return await FluxWebhookEndpoints.HandleFluxWebhook(
            fluxEvent,
            new HelmReleaseClient(kubernetes),
            new StubHttpClientFactory(designerHandler),
            new StubHostEnvironment(),
            new GatewayMetrics(_metrics.MeterFactory),
            NullLogger<Program>.Instance,
            TestContext.Current.CancellationToken
        );
    }

    // The webhook's server span, which the handler finds as the current activity.
    private Activity StartWebhookSpan() =>
        _testSource.StartActivity("POST /api/v1/flux/webhook")
        ?? throw new InvalidOperationException("The test's activity source has no listener.");

    private static FluxEvent FluxEventFor(string helmReleaseName, string reason = "UpgradeSucceeded") =>
        new()
        {
            InvolvedObject = new ObjectReference
            {
                Kind = "HelmRelease",
                Name = helmReleaseName,
                Namespace = "default",
            },
            Severity = EventSeverity.Info,
            Timestamp = DateTimeOffset.UnixEpoch,
            Message = "message",
            Reason = reason,
            ReportingController = "helm-controller",
        };

    /// <summary>
    /// Answers every request with one status code, without sending it anywhere.
    /// </summary>
    private sealed class StubHandler(HttpStatusCode statusCode) : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) =>
            Task.FromResult(
                new HttpResponseMessage(statusCode)
                {
                    RequestMessage = request,
                    Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json"),
                }
            );
    }

    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) =>
            new(handler, disposeHandler: false) { BaseAddress = new Uri("http://designer.test/") };
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "tt02";
        public string ApplicationName { get; set; } = "gateway";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
