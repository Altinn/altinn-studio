using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

public interface ILockService
{
    ValueTask<IDistributedSynchronizationHandle> AcquireOrgWideLockAsync(
        AltinnOrgContext context,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    );

    ValueTask<IDistributedSynchronizationHandle> AcquireRepoUserWideLockAsync(
        AltinnRepoEditingContext context,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    );
}
