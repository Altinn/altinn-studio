namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// Span attribute keys Langfuse reads when ingesting OTLP.
///
/// These names are Langfuse's wire contract, not ours — they are the keys its
/// ingestion processor looks for when turning an OTel span into a trace or an
/// observation. Anything not listed here still arrives, but only as untyped
/// metadata.
/// </summary>
internal static class LangfuseAttributes
{
    // --- trace level: set on the root span, applied to the whole trace -----------
    public const string TraceName = "langfuse.trace.name";
    public const string TraceInput = "langfuse.trace.input";
    public const string TraceOutput = "langfuse.trace.output";
    public const string TraceTags = "langfuse.trace.tags";
    public const string SessionId = "session.id";
    public const string Environment = "langfuse.environment";
    public const string Release = "langfuse.release";

    /// <summary>Prefix; append the key. Value lands as a flat metadata entry on the trace.</summary>
    public const string TraceMetadataPrefix = "langfuse.trace.metadata.";

    // --- observation level: set on any span --------------------------------------
    public const string ObservationType = "langfuse.observation.type";
    public const string ObservationInput = "langfuse.observation.input";
    public const string ObservationOutput = "langfuse.observation.output";
    public const string ObservationModelName = "langfuse.observation.model.name";
    public const string ObservationModelParameters = "langfuse.observation.model.parameters";
    public const string ObservationUsageDetails = "langfuse.observation.usage_details";

    /// <summary>Prefix; append the key. Value lands as a flat metadata entry on the observation.</summary>
    public const string ObservationMetadataPrefix = "langfuse.observation.metadata.";

    /// <summary>Marks a span as a trace root even when it carries a parent span id.</summary>
    public const string AsRoot = "langfuse.internal.as_root";

    // --- observation type values -------------------------------------------------
    public static class ObservationTypes
    {
        public const string Agent = "agent";
        public const string Chain = "chain";
        public const string Span = "span";
        public const string Generation = "generation";
        public const string Tool = "tool";
        public const string Event = "event";
    }
}
