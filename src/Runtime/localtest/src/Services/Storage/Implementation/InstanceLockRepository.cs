#nullable enable
using System.Security.Cryptography;
using System.Text.Json;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.Storage.Implementation;

public class InstanceLockRepository(
    IOptions<LocalPlatformSettings> localPlatformSettings,
    TimeProvider timeProvider
) : IInstanceLockRepository
{
    private const int _lockSecretSizeBytes = 20;
    private readonly PartitionedAsyncLock _lock = new();

    private Task<IDisposable> Lock(Guid instanceGuid) => _lock.Lock(instanceGuid);

    private readonly LocalPlatformSettings _localPlatformSettings = localPlatformSettings.Value;

    public async Task<(AcquireLockResult Result, LockToken? lockToken)> TryAcquireLock(
        Guid instanceGuid,
        int ttlSeconds,
        string userId,
        CancellationToken cancellationToken
    )
    {
        var lockSecret = RandomNumberGenerator.GetBytes(_lockSecretSizeBytes);
        var lockSecretHash = SHA256.HashData(lockSecret);

        using var _ = await Lock(instanceGuid);

        Directory.CreateDirectory(GetInstanceLockFolder());

        foreach (var lockFile in Directory.EnumerateFiles(GetInstanceLockFolder(), $"{instanceGuid}_*.json"))
        {
            await using FileStream openStream = File.OpenRead(lockFile);
            var existingLockData = await JsonSerializer.DeserializeAsync<InstanceLock>(
                openStream,
                cancellationToken: cancellationToken);

            if (existingLockData!.LockedUntil > timeProvider.GetUtcNow())
            {
                return (AcquireLockResult.LockAlreadyHeld, null);
            }
        }

        var lockId = Guid.NewGuid();

        var now = timeProvider.GetUtcNow();
        var lockData = new InstanceLock
        {
            Id = lockId,
            InstanceGuid = instanceGuid,
            LockedAt = now,
            LockedUntil = now.AddSeconds(ttlSeconds),
            SecretHash = lockSecretHash,
            LockedBy = userId
        };

        string path = GetInstanceLockPath(instanceGuid, lockId);

        await using FileStream createStream = File.Create(path);
        await JsonSerializer.SerializeAsync(
            createStream,
            lockData,
            cancellationToken: cancellationToken
        );

        return (AcquireLockResult.Success, new LockToken(lockId, lockSecret));
    }

    public async Task<UpdateLockResult> TryUpdateLockExpiration(
        LockToken lockToken,
        Guid instanceGuid,
        int ttlSeconds,
        CancellationToken cancellationToken = default
    )
    {
        using var _ = await Lock(instanceGuid);

        var lockFile = GetInstanceLockPath(instanceGuid, lockToken.Id);
        if (!File.Exists(lockFile))
        {
            return UpdateLockResult.LockNotFound;
        }

        await using var fileStream = File.Open(lockFile, FileMode.Open, FileAccess.ReadWrite);

        var existingLockData = await JsonSerializer.DeserializeAsync<InstanceLock>(
            fileStream,
            cancellationToken: cancellationToken);

        if (!Enumerable.SequenceEqual(existingLockData!.SecretHash, SHA256.HashData(lockToken.Secret)))
        {
            return UpdateLockResult.TokenMismatch;
        }

        var now = timeProvider.GetUtcNow();

        if (existingLockData.LockedUntil <= now)
        {
            return UpdateLockResult.LockExpired;
        }

        var lockData = new InstanceLock
        {
            Id = existingLockData.Id,
            InstanceGuid = existingLockData.InstanceGuid,
            LockedAt = existingLockData.LockedAt,
            LockedUntil = now.AddSeconds(ttlSeconds),
            SecretHash = existingLockData.SecretHash,
            LockedBy = existingLockData.LockedBy
        };

        fileStream.SetLength(0);
        await JsonSerializer.SerializeAsync(
            fileStream,
            lockData,
            cancellationToken: cancellationToken
        );

        return UpdateLockResult.Success;
    }

    public Task<InstanceLock?> Get(long lockId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    private string GetInstanceLockPath(Guid instanceGuid, Guid instanceLockId)
    {
        return $"{GetInstanceLockFolder()}{instanceGuid}_{instanceLockId}.json";
    }

    private string GetInstanceLockFolder()
    {
        return _localPlatformSettings.LocalTestingStorageBasePath
            + _localPlatformSettings.DocumentDbFolder
            + _localPlatformSettings.InstanceLockFolder;
    }
}
