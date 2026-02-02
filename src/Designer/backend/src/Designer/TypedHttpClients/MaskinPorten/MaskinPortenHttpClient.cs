using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public class MaskinPortenHttpClient(HttpClient client, ILogger<MaskinPortenHttpClient> logger) : IMaskinPortenHttpClient
{
    /// <summary>
    /// Fetches available MaskinPorten scopes from both public (/api/v1/scopes/all) and access (/api/v1/scopes/access/all) endpoints.
    /// When the same scope exists in both endpoints, the one from /api/v1/scopes/all (public scopes) takes precedence.
    /// </summary>
    public async Task<IEnumerable<MaskinPortenScope>> GetAvailableScopes(CancellationToken cancellationToken = default)
    {
        var allScopesTask = client.GetAsync("/api/v1/scopes/all?accessible_for_all=true", cancellationToken);
        var accessScopesTask = client.GetAsync("/api/v1/scopes/access/all", cancellationToken);

        await Task.WhenAll(allScopesTask, accessScopesTask);

        using HttpResponseMessage allScopesResponse = await allScopesTask;
        using HttpResponseMessage accessScopesResponse = await accessScopesTask;

        allScopesResponse.EnsureSuccessStatusCode();
        accessScopesResponse.EnsureSuccessStatusCode();

        var allScopes = await allScopesResponse.Content.ReadFromJsonAsync<MaskinPortenScope[]>(cancellationToken) ?? [];
        var accessScopes = await accessScopesResponse.Content.ReadFromJsonAsync<MaskinPortenScope[]>(cancellationToken) ?? [];

        var combined = allScopes.Concat(accessScopes)
            .Where(s => s.AllowedIntegrationTypes != null && s.AllowedIntegrationTypes.Contains("maskinporten"))
            .ToArray();

        var grouped = combined
            .GroupBy(s => s.Scope)
            .ToArray();

        var duplicates = grouped.Where(g => g.Count() > 1).ToArray();
        if (duplicates.Any())
        {
            logger.LogDebug("Found {Count} duplicate scopes. First occurrence wins. Examples: {Scopes}",
                duplicates.Length,
                string.Join(", ", duplicates.Take(3).Select(g => g.Key)));
        }

        return grouped.Select(g => g.First()).ToArray();
    }
}

