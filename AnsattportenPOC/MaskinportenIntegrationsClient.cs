namespace AnsattportenPOC;

internal sealed class MaskinportenIntegrationsClient(HttpClient client)
{
    public async Task<List<ScopeAccess>> GetAvailableScopes(CancellationToken cancellationToken = default)
    {
        return await client.GetFromJsonAsync<List<ScopeAccess>>(
                "/datasharing/consumer/scope/access",
                cancellationToken: cancellationToken
            ) ?? throw new HttpRequestException();
    }
}
