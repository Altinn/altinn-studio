using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Settings;

/// <summary>
/// Metrics client settings
/// </summary>
[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class MetricsClientSettings
{
    public required string Provider { get; set; }
    public required string ApplicationLogAnalyticsWorkspaceId { get; set; }
}
