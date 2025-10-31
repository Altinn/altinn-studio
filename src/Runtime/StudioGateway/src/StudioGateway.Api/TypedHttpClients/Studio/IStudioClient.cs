using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.Studio;

public interface IStudioClient
{
    public Task UpsertFiringAlertsAsync(string org, string env, CancellationToken cancellationToken = default);
}
