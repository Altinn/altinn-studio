using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppSettings;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppSettingsService
{
    Task<AppSettingsEntity?> GetAsync(
        AltinnRepoContext context,
        string? environment = null,
        CancellationToken cancellationToken = default
    );
    Task<IReadOnlyList<AppSettingsEntity>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AppSettingsEntity> UpsertAsync(
        AltinnRepoEditingContext editingContext,
        bool undeployOnInactivity,
        string? environment = null,
        CancellationToken cancellationToken = default
    );
}
