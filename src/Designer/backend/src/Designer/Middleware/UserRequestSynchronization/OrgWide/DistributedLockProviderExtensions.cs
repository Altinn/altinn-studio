using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide;

/// <summary>
/// Extension methods for <see cref="IDistributedLockProvider"/>.
/// Enriches the provider with methods that create locks based on <see cref="AltinnOrgContext"/>.
/// </summary>
public static class DistributedLockProviderExtensions
{
    private static string GenerateKey(AltinnOrgContext context)
        => $"org_wide_lock_{context.Org}".ToLower();

    /// <summary>
    /// Constructs an <see cref="IDistributedLock"/> instance with the given <paramref name="context"/>.
    /// </summary>
    public static IDistributedLock CreateLock(this IDistributedLockProvider distributedLockProvider,
        AltinnOrgContext context)
    {
        string key = GenerateKey(context);
        return distributedLockProvider.CreateLock(key);
    }

    /// <summary>
    /// Equivalent to calling <see cref="DistributedLockProviderExtensions.CreateLock(IDistributedLockProvider,AltinnOrgContext)" /> and then
    /// <see cref="IDistributedLock.AcquireAsync(TimeSpan?, CancellationToken)" />.
    /// </summary>
    public static ValueTask<IDistributedSynchronizationHandle> AcquireLockAsync(this IDistributedLockProvider provider, AltinnOrgContext context, TimeSpan? timeout = null, CancellationToken cancellationToken = default) =>
        (provider ?? throw new ArgumentNullException(nameof(provider))).CreateLock(context).AcquireAsync(timeout, cancellationToken);


}
