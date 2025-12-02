using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.AppClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class AppClient() : IAppClient
{
    /// <inheritdoc />
    public async Task<HealthMetric> GetHealthAsync(string app, CancellationToken cancellationToken)
    {
        return new HealthMetric { Name = "health", Value = 0 };
    }
}
