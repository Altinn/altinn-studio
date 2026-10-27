namespace Altinn.App.Ai.Enrichment.Configuration;

/// <summary>
/// How much of a run's content is written to Langfuse. Only the extremes are
/// implemented today: tracing off entirely, or full capture. The narrower modes
/// exist so the configuration surface is stable the day they are needed —
/// configuring one fails fast at startup rather than silently capturing more
/// than the operator asked for.
/// </summary>
public enum PayloadCaptureMode
{
    /// <summary>Structure, timings, token counts, tool names, status. No prompt or response text. Not implemented yet.</summary>
    None,

    /// <summary>Adds non-identifying derived facts (verdict status, tool result shape). Not implemented yet.</summary>
    Metadata,

    /// <summary>Adds free text with personal identifiers masked. Not implemented yet.</summary>
    Redacted,

    /// <summary>Everything, unmasked: prompts, application data, model output, tool arguments and results.</summary>
    Full,
}

/// <summary>
/// Options for exporting enrichment traces to Langfuse over OTLP.
///
/// Disabled by default: with <see cref="Enabled"/> false no tracer provider is
/// built, so the library's <c>ActivitySource</c> has no listener and every
/// instrumentation call site collapses to a null check. An app that upgrades the
/// package and changes nothing behaves exactly as before.
/// </summary>
public sealed class LangfuseOptions
{
    public const string SectionName = "AiEnrichment:Langfuse";

    /// <summary>Master switch. When false nothing is exported and no provider is built.</summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Langfuse base URL, without a trailing path — the OTLP path is appended.
    /// Example: <c>https://langfuse.digdir.cloud</c>.
    /// </summary>
    public string? Host { get; set; }

    /// <summary>Langfuse public key (<c>pk-lf-…</c>). Scopes the export to one project.</summary>
    public string? PublicKey { get; set; }

    /// <summary>
    /// Langfuse secret key (<c>sk-lf-…</c>). Bind from configuration for local dev; in an
    /// Altinn app prefer <see cref="SecretKeySecretName"/> so the value comes from Key Vault.
    /// A directly configured value wins.
    /// </summary>
    public string? SecretKey { get; set; }

    /// <summary>
    /// Name of the secret holding the Langfuse secret key, resolved through the app's
    /// <c>ISecretsClient</c> when <see cref="SecretKey"/> is not set. Only honored by the
    /// <c>AddAiEnrichment()</c> registration.
    /// </summary>
    public string? SecretKeySecretName { get; set; }

    /// <summary>
    /// Langfuse project id. Not used for export — only to build a clickable trace URL in
    /// the correlation log line. Omit and the log line carries the trace id alone.
    /// </summary>
    public string? ProjectId { get; set; }

    /// <summary>Environment label on every trace. Defaults to the ASP.NET Core environment name, lowercased.</summary>
    public string? Environment { get; set; }

    /// <summary>Release label on every trace. Defaults to <c>AppSettings:AppVersion</c>.</summary>
    public string? Release { get; set; }

    /// <summary>How much run content to capture. See <see cref="PayloadCaptureMode"/>.</summary>
    public PayloadCaptureMode PayloadCapture { get; set; } = PayloadCaptureMode.Full;

    /// <summary>Per-attribute character cap for captured text. 0 means unlimited.</summary>
    public int MaxPayloadChars { get; set; }

    /// <summary>
    /// Head sampling ratio. Applied on the run's root span and inherited by every child, so a
    /// run is either traced completely or not at all — never partially.
    /// </summary>
    public double SampleRatio { get; set; } = 1.0;

    /// <summary>
    /// Whether the run's root span inherits the ambient activity (the incoming HTTP request).
    /// Default false: Langfuse stores a parent span id it never receives, so an inherited root
    /// renders as an orphan. Correlation is preserved through metadata and a log line instead.
    /// </summary>
    public bool InheritAmbientTrace { get; set; }

    /// <summary>Seconds to wait for the exporter to drain on shutdown.</summary>
    public int FlushTimeoutSeconds { get; set; } = 10;

    /// <summary>
    /// Export queue capacity in spans. A full queue drops spans rather than blocking the run —
    /// one submission produces up to a few hundred spans, so size this above the expected
    /// concurrent-instance total.
    /// </summary>
    public int MaxQueueSize { get; set; } = 4096;

    /// <summary>Spans per OTLP request.</summary>
    public int MaxExportBatchSize { get; set; } = 512;

    /// <summary>
    /// Forwards the OpenTelemetry SDK's own warnings and errors to the app log.
    ///
    /// The OTLP exporter reports delivery failures only to an <c>EventSource</c>, so a
    /// rejected batch, an unreachable endpoint or a proxy rejection is otherwise
    /// completely silent: spans are created, handed to the exporter, and vanish. Turn
    /// this on when traces are not arriving and the start-up preflight succeeded.
    ///
    /// Off by default because the event sources are process-wide — the host app's own
    /// OpenTelemetry pipeline writes to them too, so some lines will be about its
    /// exporter rather than ours.
    /// </summary>
    public bool Diagnostics { get; set; }
}
