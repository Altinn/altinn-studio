using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

public sealed class LockService(IDistributedLockProvider distributedLockProvider) : ILockService
{
    public ValueTask<IDistributedSynchronizationHandle> AcquireOrgWideLockAsync(
        AltinnOrgContext context,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(context);
        return distributedLockProvider.AcquireLockAsync(context, timeout, cancellationToken);
    }

    public ValueTask<IDistributedSynchronizationHandle> AcquireRepoUserWideLockAsync(
        AltinnRepoEditingContext context,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(context);
        return distributedLockProvider.AcquireLockAsync(context, timeout, cancellationToken);
    }
}
