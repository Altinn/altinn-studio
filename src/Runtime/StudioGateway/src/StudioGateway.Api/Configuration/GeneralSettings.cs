using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Configuration;

/// <summary>
/// General settings
/// </summary>
[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class GeneralSettings
{
    [ConfigurationKeyName("GATEWAY_SERVICEOWNER")]
    public required string ServiceOwner { get; set; }

    [ConfigurationKeyName("GATEWAY_ENVIRONMENT")]
    public required string Environment { get; set; }

    [ConfigurationKeyName("external-grafana-altinn-studio-gateway-token")]
    public required string AlertsClientToken { get; set; }

    [ConfigurationKeyName("studio-client-token")]
    public required string StudioClientToken { get; set; }
}
