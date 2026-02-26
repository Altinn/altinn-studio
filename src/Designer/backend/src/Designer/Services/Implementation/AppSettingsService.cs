using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppSettingsService : IAppSettingsService
{
    private readonly IAppSettingsRepository _repository;
    private readonly TimeProvider _timeProvider;

    public AppSettingsService(IAppSettingsRepository repository, TimeProvider timeProvider)
    {
        _repository = repository;
        _timeProvider = timeProvider;
    }

    public Task<AppSettingsEntity?> GetAsync(
        AltinnRepoContext context,
        string? environment = null,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        return _repository.GetAsync(context, environment, cancellationToken);
    }

    public Task<IReadOnlyList<AppSettingsEntity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return _repository.GetAllAsync(cancellationToken);
    }

    public async Task<AppSettingsEntity> UpsertAsync(
        AltinnRepoEditingContext editingContext,
        bool undeployOnInactivity,
        string? environment = null,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var existing = await _repository.GetAsync(editingContext, environment, cancellationToken);
        if (existing is not null)
        {
            existing.UndeployOnInactivity = undeployOnInactivity;
            existing.LastModifiedBy = editingContext.Developer;
            return await _repository.UpsertAsync(existing, cancellationToken);
        }

        var entity = new AppSettingsEntity
        {
            Org = editingContext.Org,
            App = editingContext.Repo,
            Environment = environment,
            UndeployOnInactivity = undeployOnInactivity,
            Created = _timeProvider.GetUtcNow(),
            CreatedBy = editingContext.Developer,
            LastModifiedBy = editingContext.Developer,
        };

        return await _repository.UpsertAsync(entity, cancellationToken);
    }
}
