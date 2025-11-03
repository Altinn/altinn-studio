#nullable disable
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppScopesService : IAppScopesService
{
    private readonly IAppScopesRepository _appRepository;
    private readonly TimeProvider _timeProvider;

    public AppScopesService(IAppScopesRepository appRepository, TimeProvider timeProvider)
    {
        _appRepository = appRepository;
        _timeProvider = timeProvider;
    }

    public Task<AppScopesEntity> GetAppScopesAsync(AltinnRepoContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return _appRepository.GetAppScopesAsync(context, cancellationToken);
    }

    public async Task<AppScopesEntity> UpsertScopesAsync(AltinnRepoEditingContext editingContext,
        ISet<MaskinPortenScopeEntity> scopes,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var appScopes = await _appRepository.GetAppScopesAsync(editingContext, cancellationToken) ??
                        GenerateNewAppScopesEntity(editingContext);

        appScopes.Scopes = scopes;
        appScopes.LastModifiedBy = editingContext.Developer;
        return await _appRepository.UpsertAppScopesAsync(appScopes, cancellationToken);
    }

    private AppScopesEntity GenerateNewAppScopesEntity(AltinnRepoEditingContext context)
    {
        return new AppScopesEntity
        {
            Org = context.Org,
            App = context.Repo,
            CreatedBy = context.Developer,
            Created = _timeProvider.GetUtcNow(),
            LastModifiedBy = context.Developer,
            Scopes = new HashSet<MaskinPortenScopeEntity>()
        };
    }
}
