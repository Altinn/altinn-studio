using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IAppResourcesService
{
    public Task<IEnumerable<ProcessTask>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    );
}
