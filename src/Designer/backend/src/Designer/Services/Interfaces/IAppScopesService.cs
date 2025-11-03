#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppScopesService
{
    Task<AppScopesEntity> GetAppScopesAsync(AltinnRepoContext context, CancellationToken cancellationToken = default);
    Task<AppScopesEntity> UpsertScopesAsync(AltinnRepoEditingContext editingContext, ISet<MaskinPortenScopeEntity> scopes, CancellationToken cancellationToken = default);
}
