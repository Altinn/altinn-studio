using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryActivityService : IRepositoryActivityService
{
    private const string CacheKeyPrefix = nameof(RepositoryActivityService);

    private readonly IRepositoryActivityRepository _repositoryActivityRepository;
    private readonly SchedulingSettings _schedulingSettings;
    private readonly TimeProvider _timeProvider;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<RepositoryActivityService> _logger;

    public RepositoryActivityService(
        IRepositoryActivityRepository repositoryActivityRepository,
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        IMemoryCache memoryCache,
        ILogger<RepositoryActivityService> logger
    )
    {
        _repositoryActivityRepository = repositoryActivityRepository;
        _schedulingSettings = schedulingSettings;
        _timeProvider = timeProvider;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task MarkActiveAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        if (!_schedulingSettings.RepositoryCleanup.Enabled)
        {
            return;
        }

        string cacheKey = GetCacheKey(editingContext);
        DateTimeOffset now = _timeProvider.GetUtcNow();
        if (
            _memoryCache.TryGetValue(cacheKey, out DateTimeOffset lastPersistedAt)
            && now - lastPersistedAt < _schedulingSettings.RepositoryCleanup.ActivityUpdateInterval
        )
        {
            return;
        }

        try
        {
            await _repositoryActivityRepository.MarkActiveAsync(editingContext, now, cancellationToken);
            _memoryCache.Set(cacheKey, now, _schedulingSettings.RepositoryCleanup.ActivityUpdateInterval * 2);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(
                exception,
                "Failed to persist local repository activity for {Developer}/{Org}/{Repository}.",
                editingContext.Developer,
                editingContext.Org,
                editingContext.Repo
            );
        }
    }

    public Task<IReadOnlyCollection<RepositoryActivityEntity>> GetAllAsync(
        CancellationToken cancellationToken = default
    ) => _repositoryActivityRepository.GetAllAsync(cancellationToken);

    public Task<RepositoryActivityEntity?> GetAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    ) => _repositoryActivityRepository.GetAsync(editingContext, cancellationToken);

    public Task<bool> TryMarkCleanupPendingAsync(
        AltinnRepoEditingContext editingContext,
        DateTimeOffset expectedLastAccessedAt,
        CancellationToken cancellationToken = default
    ) =>
        _repositoryActivityRepository.TryMarkCleanupPendingAsync(
            editingContext,
            expectedLastAccessedAt,
            cancellationToken
        );

    public async Task RemoveAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        await _repositoryActivityRepository.RemoveAsync(editingContext, cancellationToken);
        _memoryCache.Remove(GetCacheKey(editingContext));
    }

    private static string GetCacheKey(AltinnRepoEditingContext editingContext) =>
        $"{CacheKeyPrefix}:{editingContext.Developer}:{editingContext.Org}:{editingContext.Repo}";
}
