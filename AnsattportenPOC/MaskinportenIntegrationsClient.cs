namespace AnsattportenPOC;

internal interface IMaskinportenIntegrationsClient
{
    Task<List<ScopeAccess>> GetAvailableScopes(CancellationToken cancellationToken = default);
}

internal sealed class MaskinportenIntegrationsClient(HttpClient client) : IMaskinportenIntegrationsClient
{
    public async Task<List<ScopeAccess>> GetAvailableScopes(CancellationToken cancellationToken = default)
    {
        return await client.GetFromJsonAsync<List<ScopeAccess>>(
                "/datasharing/consumer/scope/access",
                cancellationToken: cancellationToken
            ) ?? throw new HttpRequestException();
    }
}
