using Altinn.App.Core.Infrastructure.Clients.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.InstanceLocking;

internal sealed partial class InstanceLocker(
    InstanceLockClient client,
    ILogger<InstanceLocker> logger,
    IHttpContextAccessor httpContextAccessor
) : IInstanceLocker
{
    private readonly HttpContext _httpContext =
        httpContextAccessor.HttpContext ?? throw new InvalidOperationException("HttpContext cannot be null.");

    private InstanceLock? _lock;

    public ValueTask LockAsync()
    {
        return LockAsync(TimeSpan.FromMinutes(5));
    }

    public async ValueTask LockAsync(TimeSpan ttl)
    {
        if (_lock is not null)
        {
            return;
        }

        var (instanceOwnerPartyId, instanceGuid) =
            GetInstanceIdentifiers() ?? throw new InvalidOperationException("Unable to extract instance identifiers.");

        var lockToken = await client.AcquireInstanceLock(instanceGuid, instanceOwnerPartyId, ttl);

        LogLockAcquired(logger, instanceGuid);

        _lock = new InstanceLock(instanceGuid, instanceOwnerPartyId, lockToken);
    }

    private (int instanceOwnerPartyId, Guid instanceGuid)? GetInstanceIdentifiers()
    {
        var routeValues = _httpContext.Request.RouteValues;

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

    public async ValueTask DisposeAsync()
    {
        if (_lock is null)
        {
            return;
        }

        try
        {
            await client.ReleaseInstanceLock(_lock.InstanceGuid, _lock.InstanceOwnerPartyId, _lock.LockToken);
        }
        catch (Exception e)
        {
            LogLockReleaseFailed(logger, _lock.InstanceGuid, e);
            return;
        }

        LogLockReleased(logger, _lock.InstanceGuid);

        _lock = null;
    }

    private sealed record InstanceLock(Guid InstanceGuid, int InstanceOwnerPartyId, string LockToken);

    [LoggerMessage(1, LogLevel.Debug, "Acquired lock for instance {InstanceGuid}.")]
    private static partial void LogLockAcquired(ILogger logger, Guid instanceGuid);

    [LoggerMessage(2, LogLevel.Debug, "Released lock for instance {InstanceGuid}.")]
    private static partial void LogLockReleased(ILogger logger, Guid instanceGuid);

    [LoggerMessage(3, LogLevel.Error, "Failed to release lock for instance {InstanceGuid}.")]
    private static partial void LogLockReleaseFailed(ILogger logger, Guid instanceGuid, Exception e);
}
