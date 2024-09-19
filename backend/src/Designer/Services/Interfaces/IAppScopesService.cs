using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppScopesService
{
    Task<IEnumerable<AppScopeEntity>> GetAppScopesAsync(AltinnRepoContext context);
    Task<AppScopeEntity> UpsertScopesAsync(AltinnRepoEditingContext editingContext, IEnumerable<MaskinPortenScopeEntity> scopes);
}
