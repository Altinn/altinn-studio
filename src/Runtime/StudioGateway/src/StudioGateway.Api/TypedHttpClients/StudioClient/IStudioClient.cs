namespace StudioGateway.Api.TypedHttpClients.StudioClient;

internal interface IStudioClient
{
    public Task UpsertFiringAlertsAsync(CancellationToken cancellationToken);
}
