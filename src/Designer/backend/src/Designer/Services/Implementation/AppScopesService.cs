using System;
using System.Collections.Generic;
using System.Diagnostics;
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
    private readonly IEnvironmentsService _environmentsService;
    private readonly TimeProvider _timeProvider;

    public AppScopesService(
        IAppScopesRepository appRepository,
        IEnvironmentsService environmentsService,
        TimeProvider timeProvider
    )
    {
        _appRepository = appRepository;
        _environmentsService = environmentsService;
        _timeProvider = timeProvider;
    }

    public async Task<AppScopesEntity?> GetAppScopesAsync(
        AltinnRepoContext context,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await IsServiceOwnerOrg(context.Org, cancellationToken))
        {
            return null;
        }

        return await _appRepository.GetAppScopesAsync(context, cancellationToken);
    }

    public async Task<AppScopesEntity?> UpsertScopesAsync(
        AltinnRepoEditingContext editingContext,
        ISet<MaskinPortenScopeEntity> scopes,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await IsServiceOwnerOrg(editingContext.Org, cancellationToken))
        {
            return null;
        }

        var appScopes =
            await _appRepository.GetAppScopesAsync(editingContext, cancellationToken)
            ?? GenerateNewAppScopesEntity(editingContext);

        appScopes.Scopes = scopes;
        appScopes.LastModifiedBy = editingContext.Developer;
        return await _appRepository.UpsertAppScopesAsync(appScopes, cancellationToken);
    }

    public async Task<AppScopesEntity?> AddDefaultMaskinportenScopesAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await IsServiceOwnerOrg(editingContext.Org, cancellationToken))
        {
            return null;
        }

        var appScopes =
            await _appRepository.GetAppScopesAsync(editingContext, cancellationToken)
            ?? GenerateNewAppScopesEntity(editingContext);

        if (DefaultMaskinportenScopes.ContainsAll(appScopes.Scopes))
        {
            return appScopes;
        }

        appScopes.Scopes = DefaultMaskinportenScopes.MergeWith(appScopes.Scopes);
        appScopes.LastModifiedBy = editingContext.Developer;
        return await _appRepository.UpsertAppScopesAsync(appScopes, cancellationToken);
    }

    private async Task<bool> IsServiceOwnerOrg(string org, CancellationToken cancellationToken)
    {
        try
        {
            return await _environmentsService.IsAltinnOrg(org, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            var activity = Activity.Current;
            activity?.SetTag("org", org);
            activity?.AddException(exception);
            activity?.SetStatus(ActivityStatusCode.Error, exception.GetType().Name);
            return false;
        }
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
            Scopes = new HashSet<MaskinPortenScopeEntity>(),
        };
    }
}
