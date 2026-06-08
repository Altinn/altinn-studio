using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Internal.InstanceLocking;

internal sealed class InstanceLocker(
    InstanceLockClient client,
    IHttpContextAccessor httpContextAccessor,
    Telemetry? telemetry = null
) : IInstanceLocker
{
    private static readonly AsyncLocal<InstanceLockHolder> _currentLock = new();

    public IInstanceLock InitLock()
    {
        var httpContext =
            httpContextAccessor.HttpContext ?? throw new InvalidOperationException("HttpContext cannot be null.");

        var (instanceOwnerPartyId, instanceGuid) =
            GetInstanceIdentifiers(httpContext)
            ?? throw new InvalidOperationException("Unable to extract instance identifiers.");

        return InitLock(instanceOwnerPartyId, instanceGuid);
    }

    public IInstanceLock InitLock(int instanceOwnerPartyId, Guid instanceGuid)
    {
        var holder = _currentLock.Value;
        if (holder?.LockToken is not null)
        {
            throw new InvalidOperationException(
                "A lock is already held in the current async context. Use UpdateTtl on the existing lock to extend it."
            );
        }

        if (holder is null)
        {
            holder = new InstanceLockHolder();
            _currentLock.Value = holder;
        }

        if (!holder.TryActivateHandle())
        {
            throw new InvalidOperationException(
                "A lock handle is already active in the current async context. Dispose the existing handle before creating another."
            );
        }

        return new InstanceLockHandle(client, telemetry, holder, instanceGuid, instanceOwnerPartyId);
    }

    public Task<IInstanceLock> Lock()
    {
        var handle = InitLock();
        return AcquireAndReturn(handle, ttl: null);
    }

    public Task<IInstanceLock> Lock(TimeSpan ttl)
    {
        var handle = InitLock();
        return AcquireAndReturn(handle, ttl);
    }

    private static async Task<IInstanceLock> AcquireAndReturn(IInstanceLock handle, TimeSpan? ttl)
    {
        try
        {
            await handle.Lock(ttl);
            return handle;
        }
        catch
        {
            await handle.DisposeAsync();
            throw;
        }
    }

    public string? CurrentLockToken => _currentLock.Value?.LockToken;

    public void UseExternalLockToken(string lockToken)
    {
        var holder = _currentLock.Value;
        if (holder is null)
        {
            holder = new InstanceLockHolder();
            _currentLock.Value = holder;
        }

        holder.LockToken = lockToken;
    }

    private static (int instanceOwnerPartyId, Guid instanceGuid)? GetInstanceIdentifiers(HttpContext httpContext)
    {
        var routeValues = httpContext.Request.RouteValues;

        if (
            routeValues.TryGetValue("instanceOwnerPartyId", out var partyIdObj)
            && routeValues.TryGetValue("instanceGuid", out var guidObj)
            && int.TryParse(partyIdObj?.ToString(), out var partyId)
            && Guid.TryParse(guidObj?.ToString(), out var guid)
        )
        {
            return (partyId, guid);
        }

        return null;
    }

    private sealed class InstanceLockHolder
    {
        private bool _hasActiveHandle;

        public string? LockToken { get; set; }

        public bool TryActivateHandle()
        {
            if (_hasActiveHandle)
            {
                return false;
            }

            _hasActiveHandle = true;
            return true;
        }

        public void ReleaseHandle() => _hasActiveHandle = false;
    }

    private sealed class InstanceLockHandle(
        InstanceLockClient client,
        Telemetry? telemetry,
        InstanceLockHolder holder,
        Guid instanceGuid,
        int instanceOwnerPartyId
    ) : IInstanceLock
    {
        private static readonly TimeSpan _defaultTtl = TimeSpan.FromMinutes(5);
        private bool _disposed;

        public async Task Lock(TimeSpan? ttl = null)
        {
            ThrowIfDisposed();

            if (holder.LockToken is not null)
            {
                return;
            }

            var lockToken = await client.AcquireInstanceLock(instanceGuid, instanceOwnerPartyId, ttl ?? _defaultTtl);
            holder.LockToken = lockToken;
        }

        public async Task UpdateTtl(TimeSpan ttl)
        {
            ThrowIfDisposed();

            var lockToken = holder.LockToken ?? throw new InvalidOperationException("No lock held.");
            await client.UpdateInstanceLock(instanceGuid, instanceOwnerPartyId, lockToken, ttl);
        }

        public async ValueTask DisposeAsync()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;

            var lockToken = holder.LockToken;
            if (lockToken is null)
            {
                holder.ReleaseHandle();
                return;
            }

            using var activity = telemetry?.StartReleaseInstanceLockActivity(instanceGuid, instanceOwnerPartyId);

            try
            {
                await client.UpdateInstanceLock(instanceGuid, instanceOwnerPartyId, lockToken, TimeSpan.Zero);

                holder.LockToken = null;
                holder.ReleaseHandle();
            }
            catch (Exception e)
            {
                activity?.Errored(e);
            }
        }

        private void ThrowIfDisposed()
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
        }
    }
}
