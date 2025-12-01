namespace StudioGateway.Api.TypedHttpClients.StudioClient;

public interface IStudioClient
{
    public Task UpsertFiringAlertsAsync(CancellationToken cancellationToken = default);
}
