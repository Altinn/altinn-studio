using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Settings;

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
}
