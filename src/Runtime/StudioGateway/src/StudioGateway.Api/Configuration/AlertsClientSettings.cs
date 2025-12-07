using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Configuration;

/// <summary>
/// Alerts client settings
/// </summary>
[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class AlertsClientSettings
{
    public required string Provider { get; set; }
    public required string BaseUrl { get; set; }
}
