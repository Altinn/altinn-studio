using System.Diagnostics.Tracing;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// Owns the tracer provider that exports enrichment spans to Langfuse.
///
/// The provider is deliberately the library's own rather than the host app's. It
/// listens to exactly one <c>ActivitySource</c>, so no ASP.NET Core or HttpClient
/// span can reach Langfuse, and — because the host's provider does not list our
/// source — no enrichment span reaches the host's exporter either. The isolation
/// is structural: an allow-list on each side, not a filter in the middle.
///
/// Registered as an <see cref="IHostedService"/> so the generic host awaits the
/// final flush on shutdown.
/// </summary>
internal sealed class LangfuseTracing(
    IOptions<LangfuseOptions> options,
    ILangfuseKeyProvider keyProvider,
    EnrichmentTrace trace,
    ILogger<LangfuseTracing> logger) : IHostedService, IDisposable
{
    /// <summary>
    /// Langfuse's OTLP trace endpoint, signal path included. Setting
    /// <c>OtlpExporterOptions.Endpoint</c> explicitly suppresses the exporter's own
    /// signal-path suffixing, so this has to be the complete URL — pointing at the
    /// receiver root alone yields a 404. Verified against a live instance.
    /// </summary>
    private const string OtlpTracesPath = "api/public/otel/v1/traces";

    /// <summary>Cheap authenticated GET used to validate credentials at start-up.</summary>
    private const string ProjectsPath = "api/public/projects";

    /// <summary>Langfuse's OTLP ingestion contract version. Bumping it is a wire-format change.</summary>
    private const string IngestionVersion = "4";

    private TracerProvider? _provider;
    private OtelSelfDiagnostics? _diagnostics;

    /// <summary>True once a provider exists, i.e. spans are actually being exported.</summary>
    public bool IsActive => _provider is not null;

    /// <summary>Project id, from configuration or discovered during the credential preflight.</summary>
    public string? ProjectId { get; private set; }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var opts = options.Value;
        if (!opts.Enabled)
            return;

        try
        {
            if (!Validate(opts))
                return;

            var secretKey = await keyProvider.GetSecretKeyAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(secretKey))
            {
                // The provider already logged why. Nothing more to add.
                return;
            }

            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{opts.PublicKey}:{secretKey}"));
            ProjectId = opts.ProjectId;

            if (!await CredentialsAccepted(opts, credentials, cancellationToken))
                return;

            if (opts.Diagnostics)
            {
                // Started before the provider so that failures raised while building it
                // are captured too.
                _diagnostics = new OtelSelfDiagnostics();
                _diagnostics.Start(logger);
            }

            _provider = Build(opts, credentials);

            // Deep links need the project id, which the preflight may only just have
            // discovered. Runs started before this point would have had nowhere to link to.
            trace.Activate(ProjectId);

            logger.LogInformation(
                "Langfuse tracing enabled: host={Host}, project={ProjectId}, environment={Environment}, capture={Capture}",
                opts.Host, ProjectId ?? "(unknown)", opts.Environment, opts.PayloadCapture);
        }
        catch (Exception ex)
        {
            // A misconfigured observability section must never stop an app from booting.
            logger.LogError(ex, "Could not initialise Langfuse tracing; it stays disabled");
            _provider = null;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (_provider is null)
            return Task.CompletedTask;

        try
        {
            var flushTimeout = (int)TimeSpan.FromSeconds(options.Value.FlushTimeoutSeconds).TotalMilliseconds;
            if (!_provider.ForceFlush(flushTimeout))
            {
                logger.LogWarning(
                    "Langfuse export did not drain within {Seconds}s; some spans were dropped",
                    options.Value.FlushTimeoutSeconds);
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Langfuse flush failed on shutdown");
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// One authenticated call before the first export.
    ///
    /// The OTLP exporter reports delivery failures only to its own EventSource, so a
    /// rejected key is otherwise indistinguishable from everything working: no error
    /// anywhere and no traces in Langfuse. Bad credentials are worth failing loudly
    /// for; an unreachable Langfuse is not, because it may well be back before the
    /// first submission, so that case exports anyway.
    /// </summary>
    private async Task<bool> CredentialsAccepted(LangfuseOptions opts, string credentials, CancellationToken cancellationToken)
    {
        var endpoint = new Uri(new Uri(opts.Host!.TrimEnd('/') + "/"), ProjectsPath);

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            using var response = await client.SendAsync(request, cancellationToken);

            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                logger.LogError(
                    "Langfuse rejected the configured credentials ({StatusCode}); tracing stays disabled. "
                        + "Check {Section}:PublicKey and {Section}:SecretKey / {Section}:SecretKeySecretName.",
                    (int)response.StatusCode, LangfuseOptions.SectionName, LangfuseOptions.SectionName, LangfuseOptions.SectionName);
                return false;
            }

            if (response.IsSuccessStatusCode)
                ProjectId ??= await ReadProjectId(response, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Could not reach Langfuse at {Endpoint} to verify credentials; exporting anyway",
                endpoint);
            return true;
        }
    }

    private static async Task<string?> ReadProjectId(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            // A key is scoped to one project, so the list holds exactly the one we export to.
            return document.RootElement.TryGetProperty("data", out var data)
                && data.ValueKind == JsonValueKind.Array
                && data.GetArrayLength() > 0
                && data[0].TryGetProperty("id", out var id)
                ? id.GetString()
                : null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private bool Validate(LangfuseOptions opts)
    {
        if (opts.PayloadCapture != PayloadCaptureMode.Full)
        {
            logger.LogError(
                "{Section}:PayloadCapture '{Mode}' is not implemented yet — only '{Supported}' is. Tracing stays disabled.",
                LangfuseOptions.SectionName, opts.PayloadCapture, nameof(PayloadCaptureMode.Full));
            return false;
        }

        if (string.IsNullOrWhiteSpace(opts.Host) || !Uri.TryCreate(opts.Host, UriKind.Absolute, out _))
        {
            logger.LogError(
                "{Section}:Host must be an absolute URL when tracing is enabled (was '{Host}'). Tracing stays disabled.",
                LangfuseOptions.SectionName, opts.Host);
            return false;
        }

        if (string.IsNullOrWhiteSpace(opts.PublicKey))
        {
            logger.LogError(
                "{Section}:PublicKey is required when tracing is enabled. Tracing stays disabled.",
                LangfuseOptions.SectionName);
            return false;
        }

        if (string.IsNullOrWhiteSpace(opts.SecretKey) && string.IsNullOrWhiteSpace(opts.SecretKeySecretName))
        {
            logger.LogError(
                "Neither {Section}:SecretKey nor {Section}:SecretKeySecretName is configured. Tracing stays disabled.",
                LangfuseOptions.SectionName, LangfuseOptions.SectionName);
            return false;
        }

        return true;
    }

    private TracerProvider Build(LangfuseOptions opts, string credentials)
    {
        var endpoint = new Uri(new Uri(opts.Host!.TrimEnd('/') + "/"), OtlpTracesPath);

        return Sdk.CreateTracerProviderBuilder()
            .AddSource(EnrichmentActivitySource.Name)
            .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(
                serviceName: EnrichmentActivitySource.Name,
                serviceVersion: opts.Release))
            .SetSampler(new ParentBasedSampler(new TraceIdRatioBasedSampler(opts.SampleRatio)))
            .AddOtlpExporter(exporter =>
            {
                exporter.Endpoint = endpoint;
                exporter.Protocol = OtlpExportProtocol.HttpProtobuf;

                // Headers, not HttpClientFactory: the OTLP exporter ignores the factory
                // for this protocol, so a DelegatingHandler never runs. Values are split
                // on the first '=', which keeps base64 padding intact.
                exporter.Headers =
                    $"Authorization=Basic {credentials},x-langfuse-ingestion-version={IngestionVersion}";

                exporter.BatchExportProcessorOptions.MaxQueueSize = opts.MaxQueueSize;
                exporter.BatchExportProcessorOptions.MaxExportBatchSize = opts.MaxExportBatchSize;
            })
            .Build();
    }

    public void Dispose()
    {
        _provider?.Dispose();
        _diagnostics?.Dispose();
    }

    /// <summary>
    /// Forwards the OpenTelemetry SDK's own diagnostics to the app log.
    ///
    /// The OTLP exporter never throws and never returns a failure to the caller: a
    /// rejected batch is reported to an <c>EventSource</c> and nowhere else. Without
    /// this, an export that fails on every single batch looks exactly like one that
    /// works — spans are created, accepted by the processor, and silently discarded.
    ///
    /// The event sources are process-wide, so when the host app runs its own
    /// OpenTelemetry pipeline some of these lines will be about its exporter. That is
    /// why this is opt-in rather than always on.
    /// </summary>
    private sealed class OtelSelfDiagnostics : EventListener
    {
        private readonly List<EventSource> _pending = [];
        private readonly object _gate = new();
        private ILogger? _logger;

        /// <summary>
        /// Attaches the logger and enables everything seen so far.
        ///
        /// The base <see cref="EventListener"/> constructor replays already-created
        /// sources before a derived class can finish initialising, so the logger cannot
        /// be supplied through the constructor — those early callbacks would race it.
        /// </summary>
        public void Start(ILogger logger)
        {
            EventSource[] pending;
            lock (_gate)
            {
                _logger = logger;
                pending = [.. _pending];
                _pending.Clear();
            }

            foreach (var source in pending)
                EnableEvents(source, EventLevel.Warning);
        }

        protected override void OnEventSourceCreated(EventSource eventSource)
        {
            if (!eventSource.Name.StartsWith("OpenTelemetry", StringComparison.Ordinal))
                return;

            lock (_gate)
            {
                if (_logger is null)
                {
                    _pending.Add(eventSource);
                    return;
                }
            }

            EnableEvents(eventSource, EventLevel.Warning);
        }

        protected override void OnEventWritten(EventWrittenEventArgs eventData)
        {
            var log = _logger;
            if (log is null)
                return;

            try
            {
                var message = Format(eventData);
                if (eventData.Level == EventLevel.Error || eventData.Level == EventLevel.Critical)
                    log.LogError("OpenTelemetry [{Source}] {Message}", eventData.EventSource?.Name, message);
                else
                    log.LogWarning("OpenTelemetry [{Source}] {Message}", eventData.EventSource?.Name, message);
            }
            catch (Exception)
            {
                // A diagnostics channel must never be the thing that breaks the app.
            }
        }

        private static string Format(EventWrittenEventArgs eventData)
        {
            if (string.IsNullOrEmpty(eventData.Message))
                return eventData.EventName ?? "(unnamed event)";

            try
            {
                var payload = eventData.Payload is null ? [] : eventData.Payload.ToArray();
                return string.Format(CultureInfo.InvariantCulture, eventData.Message, payload);
            }
            catch (FormatException)
            {
                return eventData.Message;
            }
        }
    }
}
