#nullable enable
using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide;

/// <summary>
/// Extension methods for <see cref="IDistributedLockProvider"/>.
/// Enriches the provider with methods that create locks based on <see cref="AltinnRepoEditingContext"/>.
/// </summary>
public static class DistributedLockProviderExtensions
{
    private static string GenerateKey(AltinnRepoEditingContext editingContext)
        => $"{editingContext.Org}_{editingContext.Repo}_{editingContext.Developer}".ToLower();

    /// <summary>
    /// Constructs an <see cref="IDistributedLock"/> instance with the given <paramref name="editingContext"/>.
    /// </summary>
    public static IDistributedLock CreateLock(this IDistributedLockProvider distributedLockProvider,
        AltinnRepoEditingContext editingContext)
    {
        string key = GenerateKey(editingContext);
        return distributedLockProvider.CreateLock(key);
    }

    /// <summary>
    /// Equivalent to calling <see cref="DistributedLockProviderExtensions.CreateLock(IDistributedLockProvider,AltinnRepoEditingContext)" /> and then
    /// <see cref="IDistributedLock.AcquireAsync(TimeSpan?, CancellationToken)" />.
    /// </summary>
    public static ValueTask<IDistributedSynchronizationHandle> AcquireLockAsync(this IDistributedLockProvider provider, AltinnRepoEditingContext editingContext, TimeSpan? timeout = null, CancellationToken cancellationToken = default) =>
        (provider ?? throw new ArgumentNullException(nameof(provider))).CreateLock(editingContext).AcquireAsync(timeout, cancellationToken);


}
