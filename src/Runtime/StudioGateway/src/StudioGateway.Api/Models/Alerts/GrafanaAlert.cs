using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Models.Alerts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed record GrafanaAlert
{
    public required Dictionary<string, string> Labels { get; init; }
    public required Dictionary<string, string> Annotations { get; init; }
    public required string GeneratorURL { get; init; }
    public required string Fingerprint { get; init; }
}
