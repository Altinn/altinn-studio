using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public interface IMaskinPortenHttpClient
{
    public Task<IEnumerable<MaskinPortenScope>> GetAvailableScopes(CancellationToken cancellationToken = default);
}

