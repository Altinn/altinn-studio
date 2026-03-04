using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IResourceRegistryRepository
{
    public Task<List<ServiceResource>> GetServiceResources(
        string env,
        bool includeApps = false,
        bool includeAltinn2 = false
    );
}
