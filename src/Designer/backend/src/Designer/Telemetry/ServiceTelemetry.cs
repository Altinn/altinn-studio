using System.Diagnostics;

namespace Altinn.Studio.Designer.Telemetry;

internal static class ServiceTelemetry
{
    private const string SamplingAttribute = "altinn.studio.sampling";
    private const string AlwaysSample = "always";

    public static readonly ActivitySource Source = new("studio-designer");

    // Tail sampling is configured per collector pipeline, not globally.
    // We explicitly mark spans that must be retained.
    public static void SetAlwaysSample(this Activity? activity) =>
        activity?.SetTag(SamplingAttribute, AlwaysSample);
}
