#nullable disable
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public class MaskinPortenHttpClient(HttpClient client) : IMaskinPortenHttpClient
{
    public async Task<IEnumerable<MaskinPortenScope>> GetAvailableScopes(CancellationToken cancellationToken = default)
    {
        using HttpResponseMessage response = await client.GetAsync("/datasharing/consumer/scope/access", cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<IEnumerable<MaskinPortenScope>>(cancellationToken);
    }
}

