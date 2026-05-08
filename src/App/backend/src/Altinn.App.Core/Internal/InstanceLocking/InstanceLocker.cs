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
        await handle.Lock(ttl);
        return handle;
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
        public string? LockToken { get; set; }
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

        public async Task Lock(TimeSpan? ttl = null)
        {
            if (holder.LockToken is not null)
            {
                return;
            }

            var lockToken = await client.AcquireInstanceLock(instanceGuid, instanceOwnerPartyId, ttl ?? _defaultTtl);
            holder.LockToken = lockToken;
        }

        public async Task UpdateTtl(TimeSpan ttl)
        {
            var lockToken = holder.LockToken ?? throw new InvalidOperationException("No lock held.");
            await client.UpdateInstanceLock(instanceGuid, instanceOwnerPartyId, lockToken, ttl);
        }

        public async ValueTask DisposeAsync()
        {
            var lockToken = holder.LockToken;
            if (lockToken is null)
            {
                return;
            }

            using var activity = telemetry?.StartReleaseInstanceLockActivity(instanceGuid, instanceOwnerPartyId);

            try
            {
                await client.UpdateInstanceLock(instanceGuid, instanceOwnerPartyId, lockToken, TimeSpan.Zero);

                holder.LockToken = null;
            }
            catch (Exception e)
            {
                activity?.Errored(e);
            }
        }
    }
}
