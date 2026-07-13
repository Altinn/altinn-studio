using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.InstanceLocking;

internal interface IInstanceLock : IAsyncDisposable
{
    /// <summary>
    /// Acquires the instance lock. <paramref name="authenticationMethod"/> selects the Storage
    /// authentication used for the lock operations (acquire, TTL updates and release); when null the
    /// current user is used, which requires an authenticated HTTP request context. Callers running
    /// outside a user context (e.g. system-initiated advances from background listeners or webhooks)
    /// must pass <see cref="StorageAuthenticationMethod.ServiceOwner()"/>.
    /// </summary>
    Task Lock(TimeSpan? ttl = null, StorageAuthenticationMethod? authenticationMethod = null);

    Task UpdateTtl(TimeSpan ttl);
}
