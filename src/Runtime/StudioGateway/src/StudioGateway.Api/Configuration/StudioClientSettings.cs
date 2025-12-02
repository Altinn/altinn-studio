using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Configuration;

/// <summary>
/// Studio client settings
/// </summary>
[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class StudioClientSettings
{
    public required string BaseUrl { get; set; }
    public required string Token { get; set; }
}
