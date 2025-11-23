namespace StudioGateway.Api.TypedHttpClients.StudioClient;

public interface IStudioClient
{
    public Task UpsertFiringAlertsAsync(string org, string env, CancellationToken cancellationToken = default);
}
