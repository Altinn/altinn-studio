using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;

namespace Altinn.Studio.Designer.Repository;

public interface IOrgSettingsRepository
{
    Task<OrgSettingsEntity?> GetAsync(string org, CancellationToken cancellationToken = default);
    Task<OrgSettingsEntity> UpsertAsync(OrgSettingsEntity entity, CancellationToken cancellationToken = default);
}
