#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppResourcesService
{
    public Task<ApplicationMetadata> GetApplicationMetadata(
        string org,
        string env,
        string app,
        CancellationToken ct
    );

    public Task<IEnumerable<ProcessTask>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    );
}
