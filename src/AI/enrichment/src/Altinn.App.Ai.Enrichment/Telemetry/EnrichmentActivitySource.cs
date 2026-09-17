using System.Diagnostics;
using System.Reflection;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// The single <see cref="ActivitySource"/> the enrichment engine emits spans from.
///
/// The name is a wire contract: <c>LangfuseTracing</c> passes it to
/// <c>AddSource</c> when it builds the library's own tracer provider, and a host
/// that also wants these spans in its own pipeline registers the same name. The
/// host app's provider does not listen to it by default, which is what keeps
/// enrichment spans out of Application Insights and app spans out of Langfuse.
/// </summary>
internal static class EnrichmentActivitySource
{
    public const string Name = "Altinn.App.Ai.Enrichment";

    private static readonly string Version =
        typeof(EnrichmentActivitySource).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? typeof(EnrichmentActivitySource).Assembly.GetName().Version?.ToString()
        ?? "0.0.0";

    public static readonly ActivitySource Source = new(Name, Version);
}
