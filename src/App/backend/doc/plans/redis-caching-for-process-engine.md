# Plan: Redis Caching for Process Engine Commands

## Implementation Guidelines (for AI agents)

Before implementing, read and follow these rules:

### 1. Read Before Writing
- **Always read existing files** before modifying them - don't assume structure
- Check `CLAUDE.md` in the repo root for project-specific coding standards
- Look at similar existing code for patterns (e.g., other `IDistributedCache` usage, existing try/catch patterns)

### 2. Follow Existing Patterns
- Match the codebase's naming conventions, formatting, and style
- Use `internal` accessibility by default (per CLAUDE.md)
- Use `sealed` for classes unless inheritance is needed
- Don't add XML doc comments unless the existing code has them in similar places

### 3. Implement Incrementally
- Complete one phase fully before starting the next
- Build (`dotnet build`) after each phase to catch errors early
- Don't skip phases or combine them

### 4. Keep It Minimal
- Implement exactly what the plan specifies - no extras
- Don't refactor surrounding code
- Don't add "nice to have" features
- If something seems missing from the plan, ask rather than invent

### 5. Best-Effort Caching Rules
- Cache failures must **never** fail the main operation
- All Redis operations must be wrapped in try/catch
- On read failure → treat as cache miss, continue to Storage
- On write failure → log warning, continue without caching

### 6. Testing
- **NOTE:** Many tests are currently failing due to test infrastructure issues unrelated to this work. Ignore existing test failures.
- Focus on ensuring the build succeeds: `dotnet build`
- Don't add unit tests unless specifically requested
- Don't add integration tests unless specifically requested

### 7. File Locations
- New interfaces/classes go in `src/Altinn.App.Core/Internal/ProcessEngine/`
- Follow the existing folder structure - don't create new folders unless necessary

### 8. Checklist (mark as you complete)

```
Phase 1: Infrastructure
[x] Add Redis to docker-compose.yml
[x] Add NuGet package to Altinn.App.Core.csproj
[x] Build succeeds

Phase 2: Cache Abstraction
[x] Create IProcessingSessionCache interface
[x] Create RedisProcessingSessionCache implementation
[x] Create NullProcessingSessionCache implementation
[x] Build succeeds

Phase 3: UoW Integration
[x] Add lockToken and cache fields to InstanceDataUnitOfWork constructor
[x] Update GetBinaryData() to check Redis
[x] Update SaveChanges() to update Redis
[x] Add InitWithSession() to InstanceDataUnitOfWorkInitializer
[x] Build succeeds

Phase 4: Controller Update
[x] Add LockToken to ProcessEngineAppCallbackPayload
[x] Update ProcessEngineCallbackController to use InitWithSession()
[x] Build succeeds

Phase 5: DI Registration
[x] Add AddProcessingSessionCache() extension method
[x] Wire up in service registration
[x] Build succeeds

Phase 6: Process Engine Updates (separate repo/PR if PE is external)
[ ] Include LockToken in callbacks

Final
[x] Full build succeeds: dotnet build solutions/All.sln
[x] (Skip tests - many are failing due to unrelated infrastructure issues)
```

---

## Problem Statement

The new Process Engine architecture executes commands via HTTP callbacks to the App. Each callback is stateless, causing repeated fetches of Instance and form data from Storage for every command in a sequence. This is inefficient when multiple commands operate on the same data.

## Goal

Cache Instance and form data across HTTP requests for the duration of a distributed lock/processing session, integrated with `InstanceDataUnitOfWork`

## Key Insight

`InstanceDataUnitOfWork` already has in-memory caching via `_binaryCache` and `_formDataCache`. These work within a single HTTP request but are lost between requests.

**Solution**: Use Redis as the **primary cache** across requests. The existing `_binaryCache` becomes just request-scoped deduplication (avoid hitting Redis twice in the same request).

```
_binaryCache (request-scoped) → Redis (cross-request) → Storage (source of truth)
```

This is simpler than "hydrate + flush" because:
- **One source of truth** - Redis is THE cache, not a persistence layer for another cache
- **Naturally lazy** - Only cache what's actually accessed
- **No sync issues** - No two caches to keep in sync
- **Less code** - No hydration step, no flush logic

## Design Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Process Engine  │     │ App             │     │ Redis           │
│                 │     │                 │     │                 │
│ Callback 1 ────────►  │ Init UoW        │     │                 │
│ (lockToken)     │     │   └─► Get Instance ──► │ Cache miss      │
│                 │     │       └─► Fetch from Storage             │
│                 │     │       └─► Store ─────► │ Cache Instance  │
│                 │     │ Execute cmd     │     │                 │
│                 │     │   └─► GetBinaryData    │                 │
│                 │     │       └─► Check ─────► │ Cache miss      │
│                 │     │       └─► Fetch from Storage             │
│                 │     │       └─► Store ─────► │ Cache data      │
│                 │     │ SaveChanges ──────────► │ Update cache   │
│ ◄────────────── │     │                 │     │                 │
│                 │     │                 │     │                 │
│ Callback 2 ────────►  │ Init UoW        │     │                 │
│ (lockToken)     │     │   └─► Get Instance ──► │ Cache HIT!     │
│                 │     │ Execute cmd     │     │                 │
│                 │     │   └─► GetBinaryData    │                 │
│                 │     │       └─► Check ─────► │ Cache HIT!     │
│                 │     │ SaveChanges ──────────► │ Update cache   │
│ ◄────────────── │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Implementation Steps

### Phase 1: Infrastructure

#### 1.1 Add Redis to Docker Compose

**File:** `test/Altinn.App.Integration.Tests/_localtest/docker-compose.yml`

```yaml
  redis:
    container_name: localtest-redis
    image: redis:7-alpine
    restart: always
    networks:
      - altinntestlocal_network
    ports:
      - "6379:6379"
    # No AOF needed for cache - data can be lost on restart
    # Configure eviction policy for cache usage
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Note:** No persistence (`--appendonly yes`) needed for cache usage. If Redis restarts, cache misses will repopulate from Storage. Configure `maxmemory-policy` to evict least-recently-used keys when memory limit is reached.

#### 1.2 Add NuGet Packages

**File:** `src/Altinn.App.Core/Altinn.App.Core.csproj`

```xml
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="8.0.x" />
```

### Phase 2: Cache Abstraction

#### 2.1 Create Processing Session Cache Interface

**File:** `src/Altinn.App.Core/Internal/ProcessEngine/IProcessingSessionCache.cs`

A simple interface for caching Instance and binary data per session:

```csharp
namespace Altinn.App.Core.Internal.ProcessEngine;

/// <summary>
/// Cache for Instance and form data during a processing session (distributed lock scope).
/// </summary>
internal interface IProcessingSessionCache
{
    /// <summary>
    /// Try to get cached Instance for the session.
    /// </summary>
    Task<Instance?> GetInstance(string lockToken, CancellationToken ct = default);

    /// <summary>
    /// Cache Instance for the session.
    /// </summary>
    Task SetInstance(string lockToken, Instance instance, CancellationToken ct = default);

    /// <summary>
    /// Try to get cached binary data for a data element.
    /// </summary>
    Task<ReadOnlyMemory<byte>?> GetBinaryData(string lockToken, Guid dataElementId, CancellationToken ct = default);

    /// <summary>
    /// Cache binary data for a data element.
    /// </summary>
    Task SetBinaryData(string lockToken, Guid dataElementId, ReadOnlyMemory<byte> data, CancellationToken ct = default);

    /// <summary>
    /// Remove binary data from cache (e.g., on delete).
    /// </summary>
    Task RemoveBinaryData(string lockToken, Guid dataElementId, CancellationToken ct = default);

    /// <summary>
    /// Invalidate all cached data for a session. Optional - TTL handles cleanup if not called.
    /// </summary>
    Task InvalidateSession(string lockToken, CancellationToken ct = default);
}
```

#### 2.2 Implement Redis-backed Cache

**File:** `src/Altinn.App.Core/Internal/ProcessEngine/RedisProcessingSessionCache.cs`

**Key design points:**
- **Best-effort**: All Redis operations wrapped in try/catch - failures never fail command execution
- **Sliding expiration**: TTL refreshed on each access to prevent mid-job expiry
- **Key namespace**: Includes `{org}:{app}` to prevent cross-app collisions
- **Deserialization safety**: Corrupt data treated as cache miss

```csharp
namespace Altinn.App.Core.Internal.ProcessEngine;

internal sealed class RedisProcessingSessionCache : IProcessingSessionCache
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisProcessingSessionCache> _logger;
    private readonly Telemetry? _telemetry;
    private readonly TimeSpan _slidingExpiry = TimeSpan.FromMinutes(10);

    public RedisProcessingSessionCache(
        IDistributedCache cache,
        ILogger<RedisProcessingSessionCache> logger,
        Telemetry? telemetry = null)
    {
        _cache = cache;
        _logger = logger;
        _telemetry = telemetry;
    }

    // Key format: {org}:{app}:session:{lockToken}:instance
    // LockToken should be URL-safe (GUID, no slashes)
    private static string InstanceKey(string lockToken) => $"session:{lockToken}:instance";
    private static string DataKey(string lockToken, Guid dataElementId) => $"session:{lockToken}:data:{dataElementId}";

    public async Task<Instance?> GetInstance(string lockToken, CancellationToken ct = default)
    {
        try
        {
            var key = InstanceKey(lockToken);
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes is null)
                return null;

            // Refresh TTL (sliding expiration)
            _ = RefreshTtl(key, ct);

            return JsonSerializer.Deserialize<Instance>(bytes);
        }
        catch (JsonException ex)
        {
            // Corrupt data - treat as cache miss, optionally delete
            _logger.LogWarning(ex, "Failed to deserialize cached Instance for session {LockToken}", lockToken);
            _ = TryRemove(InstanceKey(lockToken), ct);
            return null;
        }
        catch (Exception ex)
        {
            // Redis error - treat as cache miss
            _logger.LogWarning(ex, "Redis error getting Instance for session {LockToken}", lockToken);
            _telemetry?.RecordCacheError("GetInstance");
            return null;
        }
    }

    public async Task SetInstance(string lockToken, Instance instance, CancellationToken ct = default)
    {
        try
        {
            var key = InstanceKey(lockToken);
            var bytes = JsonSerializer.SerializeToUtf8Bytes(instance);
            await _cache.SetAsync(key, bytes, new DistributedCacheEntryOptions
            {
                SlidingExpiration = _slidingExpiry
            }, ct);
        }
        catch (Exception ex)
        {
            // Redis error - swallow but log
            _logger.LogWarning(ex, "Redis error setting Instance for session {LockToken}", lockToken);
            _telemetry?.RecordCacheError("SetInstance");
        }
    }

    public async Task<ReadOnlyMemory<byte>?> GetBinaryData(string lockToken, Guid dataElementId, CancellationToken ct = default)
    {
        try
        {
            var key = DataKey(lockToken, dataElementId);
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes is null)
                return null;

            // Refresh TTL (sliding expiration)
            _ = RefreshTtl(key, ct);

            return new ReadOnlyMemory<byte>(bytes);
        }
        catch (Exception ex)
        {
            // Redis error - treat as cache miss
            _logger.LogWarning(ex, "Redis error getting data {DataElementId} for session {LockToken}", dataElementId, lockToken);
            _telemetry?.RecordCacheError("GetBinaryData");
            return null;
        }
    }

    public async Task SetBinaryData(string lockToken, Guid dataElementId, ReadOnlyMemory<byte> data, CancellationToken ct = default)
    {
        try
        {
            var key = DataKey(lockToken, dataElementId);
            await _cache.SetAsync(key, data.ToArray(), new DistributedCacheEntryOptions
            {
                SlidingExpiration = _slidingExpiry
            }, ct);
        }
        catch (Exception ex)
        {
            // Redis error - swallow but log
            _logger.LogWarning(ex, "Redis error setting data {DataElementId} for session {LockToken}", dataElementId, lockToken);
            _telemetry?.RecordCacheError("SetBinaryData");
        }
    }

    public async Task RemoveBinaryData(string lockToken, Guid dataElementId, CancellationToken ct = default)
    {
        try
        {
            var key = DataKey(lockToken, dataElementId);
            await _cache.RemoveAsync(key, ct);
        }
        catch (Exception ex)
        {
            // Redis error - swallow but log
            _logger.LogWarning(ex, "Redis error removing data {DataElementId} for session {LockToken}", dataElementId, lockToken);
            _telemetry?.RecordCacheError("RemoveBinaryData");
        }
    }

    public Task InvalidateSession(string lockToken, CancellationToken ct = default)
    {
        // IDistributedCache doesn't support pattern deletion.
        // Rely on sliding expiration TTL for cleanup.
        return Task.CompletedTask;
    }

    private async Task RefreshTtl(string key, CancellationToken ct)
    {
        try
        {
            // IDistributedCache.RefreshAsync updates sliding expiration
            await _cache.RefreshAsync(key, ct);
        }
        catch
        {
            // Ignore TTL refresh failures
        }
    }

    private async Task TryRemove(string key, CancellationToken ct)
    {
        try
        {
            await _cache.RemoveAsync(key, ct);
        }
        catch
        {
            // Ignore removal failures
        }
    }
}
```

#### 2.3 Implement No-Op Cache (for non-Process Engine requests)

**File:** `src/Altinn.App.Core/Internal/ProcessEngine/NullProcessingSessionCache.cs`

```csharp
namespace Altinn.App.Core.Internal.ProcessEngine;

/// <summary>
/// No-op implementation for requests without a processing session.
/// </summary>
internal sealed class NullProcessingSessionCache : IProcessingSessionCache
{
    public static NullProcessingSessionCache Instance { get; } = new();

    public Task<Instance?> GetInstance(string lockToken, CancellationToken ct) => Task.FromResult<Instance?>(null);
    public Task SetInstance(string lockToken, Instance instance, CancellationToken ct) => Task.CompletedTask;
    public Task<ReadOnlyMemory<byte>?> GetBinaryData(string lockToken, Guid dataElementId, CancellationToken ct) => Task.FromResult<ReadOnlyMemory<byte>?>(null);
    public Task SetBinaryData(string lockToken, Guid dataElementId, ReadOnlyMemory<byte> data, CancellationToken ct) => Task.CompletedTask;
    public Task RemoveBinaryData(string lockToken, Guid dataElementId, CancellationToken ct) => Task.CompletedTask;
    public Task InvalidateSession(string lockToken, CancellationToken ct) => Task.CompletedTask;
}
```

### Phase 3: Integrate with InstanceDataUnitOfWork

The approach is simple:
1. `GetBinaryData()`: Check Redis before Storage, populate Redis on miss
2. `SaveChanges()`: Update Redis with modified data
3. No hydration step, no priming - Redis is checked lazily when data is needed

**`GetFormDataWrapper()`** calls `GetBinaryData()` internally, so it benefits automatically.

#### 3.1 Add Session Fields to InstanceDataUnitOfWork

**File:** `src/Altinn.App.Core/Internal/Data/InstanceDataUnitOfWork.cs`

```csharp
private readonly string? _lockToken;
private readonly IProcessingSessionCache _sessionCache;

public InstanceDataUnitOfWork(
    Instance instance,
    IDataClient dataClient,
    // ... existing params ...
    Telemetry? telemetry = null,
    string? lockToken = null,
    IProcessingSessionCache? sessionCache = null)
{
    // ... existing initialization ...
    _lockToken = lockToken;
    _sessionCache = sessionCache ?? NullProcessingSessionCache.Instance;
}
```

#### 3.2 Update GetBinaryData to Use Redis

**File:** `src/Altinn.App.Core/Internal/Data/InstanceDataUnitOfWork.cs`

The existing `_binaryCache` stays as request-scoped deduplication. On miss, check Redis before Storage.

**Important:** Skip Redis caching for large files (attachments) to avoid memory pressure.

```csharp
private const int MaxCacheSizeBytes = 1024 * 1024; // 1 MB - don't cache larger files

public async Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
{
    GetDataElement(dataElementIdentifier);

    return await _binaryCache.GetOrCreate(
        dataElementIdentifier,
        async () =>
        {
            // Check if this data element should be cached (form data, not large attachments)
            bool shouldCache = ShouldCacheDataElement(dataElementIdentifier);

            // 1. Check Redis (cross-request cache)
            if (_lockToken is not null && shouldCache)
            {
                var cached = await _sessionCache.GetBinaryData(_lockToken, dataElementIdentifier.Guid);
                if (cached.HasValue)
                    return cached.Value;
            }

            // 2. Fetch from Storage
            var data = await _dataClient.GetDataBytes(
                _instanceOwnerPartyId,
                _instanceGuid,
                dataElementIdentifier.Guid,
                authenticationMethod: GetAuthenticationMethod(dataElementIdentifier)
            );

            // 3. Populate Redis for subsequent requests (only if small enough)
            if (_lockToken is not null && shouldCache && data.Length <= MaxCacheSizeBytes)
            {
                await _sessionCache.SetBinaryData(_lockToken, dataElementIdentifier.Guid, data);
            }

            return data;
        }
    );
}

private bool ShouldCacheDataElement(DataElementIdentifier dataElementIdentifier)
{
    // Only cache form data (has AppLogic.ClassRef), not binary attachments
    var dataType = this.GetDataType(dataElementIdentifier);
    return dataType.AppLogic?.ClassRef is not null;
}
```

**What gets cached:**
| Type | Has ClassRef | Typical Size | Cached? |
|------|--------------|--------------|---------|
| Form data (JSON/XML) | Yes | KB - 100KB | Yes |
| Attachments (PDF, images) | No | MB+ | No |
| Large form data (>1MB) | Yes | >1MB | No |

#### 3.3 Update SaveChanges to Update Redis

**File:** `src/Altinn.App.Core/Internal/Data/InstanceDataUnitOfWork.cs`

After saving to Storage, update Redis with the new data. Respects the same size limits.

```csharp
internal async Task SaveChanges(DataElementChanges changes)
{
    using var activity = _telemetry?.StartSaveChanges(changes);
    // ... existing save logic (lines 574-589) ...

    // Update Redis with changes
    if (_lockToken is not null)
    {
        var cacheTasks = new List<Task>();

        // Update modified/created form data in Redis (only form data, respecting size limit)
        foreach (var change in changes.FormDataChanges)
        {
            if (change.CurrentBinaryData is not null
                && change.Type is ChangeType.Updated or ChangeType.Created
                && change.CurrentBinaryData.Value.Length <= MaxCacheSizeBytes)
            {
                cacheTasks.Add(_sessionCache.SetBinaryData(
                    _lockToken,
                    change.DataElementIdentifier.Guid,
                    change.CurrentBinaryData.Value));
            }
        }

        // Remove deleted data elements from Redis
        foreach (var change in changes.FormDataChanges.Where(c => c.Type == ChangeType.Deleted))
        {
            cacheTasks.Add(_sessionCache.RemoveBinaryData(
                _lockToken,
                change.DataElementIdentifier.Guid));
        }

        // Update Instance in Redis (data element list may have changed)
        cacheTasks.Add(_sessionCache.SetInstance(_lockToken, Instance));

        await Task.WhenAll(cacheTasks);
    }
}
```

**Note:** We only cache `FormDataChanges` (not `AllChanges`), which already filters to data types with `AppLogic.ClassRef`. This excludes binary attachments.

#### 3.4 Update InstanceDataUnitOfWorkInitializer

**File:** `src/Altinn.App.Core/Internal/Data/InstanceDataUnitOfWorkInitializer.cs`

Add a method that initializes with session caching. Instance is fetched from Redis if available.

**Stale Instance handling:** If cached Instance causes issues (e.g., missing data elements), the UoW can request a refresh via `RefreshInstanceFromStorage()`.

```csharp
/// <summary>
/// Initializes an <see cref="InstanceDataUnitOfWork"/> with Redis caching for a processing session.
/// </summary>
internal async Task<InstanceDataUnitOfWork> InitWithSession(
    InstanceIdentifier instanceId,
    string lockToken,
    string? taskId,
    string? language,
    StorageAuthenticationMethod? authenticationMethod,
    CancellationToken ct = default)
{
    var cache = _serviceProvider.GetService<IProcessingSessionCache>()
        ?? NullProcessingSessionCache.Instance;

    // Try to get Instance from Redis, fall back to Storage
    Instance? instance = await cache.GetInstance(lockToken, ct);
    bool fromCache = instance is not null;

    if (instance is null)
    {
        instance = await _instanceClient.GetInstance(
            instanceId.App,
            instanceId.Org,
            instanceId.InstanceOwnerPartyId,
            instanceId.InstanceGuid,
            authenticationMethod,
            ct);

        // Cache for subsequent requests
        await cache.SetInstance(lockToken, instance, ct);
    }

    var applicationMetadata = await _applicationMetadata.GetApplicationMetadata();

    return new InstanceDataUnitOfWork(
        instance,
        _dataClient,
        _instanceClient,
        applicationMetadata,
        _translationService,
        _modelSerializationService,
        _appResources,
        _frontEndSettings,
        taskId,
        language,
        _telemetry,
        lockToken,
        cache,
        instanceId,
        authenticationMethod
    );
}
```

#### 3.5 Add Stale Instance Fallback

**File:** `src/Altinn.App.Core/Internal/Data/InstanceDataUnitOfWork.cs`

If cached Instance is stale (e.g., data element not found), provide a way to refresh:

```csharp
private readonly InstanceIdentifier? _instanceIdentifier;
private readonly StorageAuthenticationMethod? _authMethod;

/// <summary>
/// Refresh Instance from Storage if cached version is stale.
/// Called when a data element lookup fails unexpectedly.
/// </summary>
internal async Task<bool> TryRefreshInstanceFromStorage(CancellationToken ct = default)
{
    if (_instanceIdentifier is null || _authMethod is null)
        return false;

    try
    {
        var freshInstance = await _instanceClient.GetInstance(
            _instanceIdentifier.App,
            _instanceIdentifier.Org,
            _instanceIdentifier.InstanceOwnerPartyId,
            _instanceIdentifier.InstanceGuid,
            _authMethod,
            ct);

        // Update local Instance
        Instance.Data.Clear();
        Instance.Data.AddRange(freshInstance.Data);
        Instance.Process = freshInstance.Process;
        // ... other fields as needed

        // Update cache with fresh data
        if (_lockToken is not null)
        {
            await _sessionCache.SetInstance(_lockToken, Instance, ct);
        }

        return true;
    }
    catch
    {
        return false;
    }
}
```

Update `GetDataElement` to use fallback:

```csharp
public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
{
    // ... existing validation ...

    var dataElement = Instance.Data.Find(d => d.Id == dataElementIdentifier.Id);

    // If not found and we have a session, try refreshing from Storage (stale cache)
    if (dataElement is null && _lockToken is not null)
    {
        // Note: This is sync, so we can't await here.
        // Alternative: throw specific exception that caller handles with refresh.
        // For now, just throw the normal error.
    }

    return dataElement
        ?? throw new InvalidOperationException(
            $"Data element of id {dataElementIdentifier.Id} not found on instance with id {Instance.Id}"
        );
}
```

**Note:** Full stale-cache recovery is complex. For v1, if data element is missing, the command will fail and retry. On retry, if Instance was updated in SaveChanges, the cache will have fresh data. Consider more sophisticated recovery in v2 if needed.

### Phase 4: Update ProcessEngineCallbackController

#### 4.1 Add Lock Token to Callback Payload

**File:** `src/Altinn.App.ProcessEngine/Models/ProcessEngineAppCallbackPayload.cs`

```csharp
public class ProcessEngineAppCallbackPayload
{
    // ... existing properties ...

    /// <summary>
    /// Lock token for caching. Same key used for distributed lock - cache has same lifecycle.
    /// </summary>
    public string? LockToken { get; set; }
}
```

#### 4.2 Update Controller to Use Session-Aware Init

**File:** `src/Altinn.App.Api/Controllers/ProcessEngineCallbackController.cs`

```csharp
public async Task<IActionResult> ExecuteCommand(...)
{
    // ... existing code ...

    InstanceDataUnitOfWork instanceDataUnitOfWork;

    if (payload.LockToken is not null)
    {
        // Use session-aware initialization with caching
        instanceDataUnitOfWork = await _instanceDataUnitOfWorkInitializer.InitWithSession(
            instanceId,
            payload.LockToken,
            instance.Process?.CurrentTask?.ElementId,
            payload.Actor.Language,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken
        );
    }
    else
    {
        // Fallback to existing behavior
        Instance instance = await _instanceClient.GetInstance(...);
        instanceDataUnitOfWork = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            instance.Process?.CurrentTask?.ElementId,
            payload.Actor.Language,
            StorageAuthenticationMethod.ServiceOwner()
        );
    }

    // ... rest of existing code ...
}
```

### Phase 5: DI Registration

#### 5.1 Add Redis Configuration

**File:** `src/Altinn.App.Core/Extensions/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddProcessingSessionCache(
    this IServiceCollection services,
    IConfiguration configuration)
{
    var redisConnection = configuration.GetConnectionString("Redis");

    if (!string.IsNullOrEmpty(redisConnection))
    {
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnection;
            options.InstanceName = "altinn-app:";
        });

        services.AddSingleton<IProcessingSessionCache, RedisProcessingSessionCache>();
    }
    else
    {
        // No Redis configured - use no-op cache
        services.AddSingleton<IProcessingSessionCache>(NullProcessingSessionCache.Instance);
    }

    return services;
}
```

### Phase 6: Process Engine Updates

#### 6.1 Use Lock Token as Cache Key

The Process Engine acquires a distributed lock at the start of `ProcessNext`. This lock token can be reused as the cache key since they have the same lifecycle:

| Event | Lock | Cache |
|-------|------|-------|
| Job starts | Acquire lock | Cache becomes valid |
| Commands execute | Lock held | Cache used |
| Job ends | Release lock | Cache expires (TTL) |

```csharp
// Lock is acquired at job start, key is passed to Process Engine
job.LockToken = acquiredLock.Key;  // e.g., a GUID from Storage

// Include in all callbacks
var payload = new ProcessEngineAppCallbackPayload
{
    CommandKey = command.CommandKey,
    Actor = task.Actor,
    Payload = command.Payload,
    LockToken = job.LockToken,  // Used as cache key
};
```

**Benefits:**
- One identifier instead of two
- Lock token is already unique, unguessable (GUID from Storage)
- Natural alignment of lock and cache lifecycle
- Lock token will also be passed on Storage calls (to verify lock is held), so it flows through the whole system

**Lock token flow:**
```
Storage (owns lock) → Process Engine (job identifier) → App (cache key + Storage calls)
```

#### 6.2 Include Lock Token in Callbacks

(Already shown above - `LockToken` is included in every callback payload)

### Phase 7: Cache Invalidation Strategy

#### Primary: TTL-Based Expiry

The simplest approach - rely on Redis TTL to clean up automatically:

- Set TTL to slightly longer than max expected job duration (default: 10 minutes)
- Redis handles cleanup automatically
- No coordination between PE and App needed
- Handles edge cases (failed jobs, crashed PE) gracefully

```csharp
// In RedisProcessingSessionCache
private readonly TimeSpan _defaultExpiry = TimeSpan.FromMinutes(10);
```

#### Optional: Explicit Cleanup Endpoint

For immediate memory reclamation, PE can notify App when job completes:

**File:** `src/Altinn.App.Api/Controllers/ProcessEngineCallbackController.cs`

```csharp
[HttpDelete("sessions/{lockToken}")]
public async Task<IActionResult> InvalidateSession(string lockToken, CancellationToken ct)
{
    var cache = _serviceProvider.GetService<IProcessingSessionCache>();
    if (cache is not null)
    {
        await cache.InvalidateSession(lockToken, ct);
    }
    return NoContent();
}
```

**Add to interface:** `src/Altinn.App.Core/Internal/ProcessEngine/IProcessingSessionCache.cs`

```csharp
/// <summary>
/// Invalidate all cached data for a session (called when job completes).
/// </summary>
Task InvalidateSession(string lockToken, CancellationToken ct = default);
```

**Implementation note:** `IDistributedCache` doesn't support pattern deletion. Options:
1. Track keys per session in a Redis Set, delete individually
2. Use StackExchange.Redis directly for `SCAN` + `DEL`
3. Just rely on TTL (recommended for v1)

#### When to Use Each

| Scenario | Strategy |
|----------|----------|
| Job completes normally | TTL (or explicit cleanup if implemented) |
| Job fails mid-sequence | TTL handles cleanup |
| PE crashes | TTL handles cleanup |
| App crashes | TTL handles cleanup |

**Recommendation:** Start with TTL only. Add explicit cleanup later if memory pressure becomes an issue.

## Configuration

### appsettings.json

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "ProcessingSessionCache": {
    "DefaultExpiryMinutes": 10
  }
}
```

### Environment Variables (Kubernetes)

```yaml
- name: ConnectionStrings__Redis
  valueFrom:
    secretKeyRef:
      name: redis-secrets
      key: connection-string
```

## Testing Strategy

### Unit Tests

1. `RedisProcessingSessionCache` - Mock `IDistributedCache`, verify key formats
2. `InstanceDataUnitOfWork` - Mock `IProcessingSessionCache`, verify cache hits/misses
3. `InstanceDataUnitOfWorkInitializer` - Verify session-aware init uses cache

### Integration Tests

1. Add Redis to integration test Docker Compose
2. Test full flow: multiple callbacks with same session ID
3. Verify Storage calls reduced (mock/spy on `IDataClient`)

## Rollout Plan

1. **Phase 1**: Add Redis to docker-compose, add packages, implement cache abstraction
2. **Phase 2**: Integrate with UoW (behind feature flag initially)
3. **Phase 3**: Update Process Engine to send session ID
4. **Phase 4**: Update ProcessEngineCallbackController
5. **Phase 5**: Enable in staging, monitor metrics
6. **Phase 6**: Production rollout

## Metrics to Track

- Cache hit rate (Instance, BinaryData)
- Storage API call reduction
- Command execution time
- Redis latency

## Open Questions

1. **TTL value**: What's the max expected job duration? Sliding expiration should be longer. (Currently 10 minutes)
2. **Size threshold**: Is 1MB the right limit for caching? Could be configurable.
3. **Stale Instance recovery**: How sophisticated should the fallback be? Current plan: retry will use fresh cache after SaveChanges updates it.

## Summary of Changes

| File | Change |
|------|--------|
| `docker-compose.yml` | Add Redis service (no persistence, LRU eviction) |
| `Altinn.App.Core.csproj` | Add Redis NuGet package |
| `IProcessingSessionCache.cs` | New interface with `InvalidateSession` |
| `RedisProcessingSessionCache.cs` | New implementation with best-effort error handling, sliding TTL |
| `NullProcessingSessionCache.cs` | New no-op implementation |
| `InstanceDataUnitOfWork.cs` | Add session fields, update `GetBinaryData()` (check Redis, size limits), update `SaveChanges()`, add `TryRefreshInstanceFromStorage()` |
| `InstanceDataUnitOfWorkInitializer.cs` | Add `InitWithSession()` method |
| `ProcessEngineCallbackController.cs` | Use `InitWithSession()` when session ID present |
| `ProcessEngineAppCallbackPayload.cs` | Add `LockToken` property (reuses distributed lock token) |
| `ServiceCollectionExtensions.cs` | Add Redis DI registration |
| `Telemetry.cs` | Add `RecordCacheError()` method (optional) |

## Benefits of This Approach

1. **Simple mental model** - Redis is THE cache, `_binaryCache` is just request-scoped deduplication
2. **Naturally lazy** - Only caches data that's actually accessed
3. **No sync issues** - One source of truth (Redis), not two caches to keep in sync
4. **Graceful degradation** - No Redis = no-op cache, existing behavior preserved
5. **Clear separation** - Cache abstraction can be swapped (Redis, PostgreSQL, etc.)

## Hardening Points Addressed

| Concern | Solution |
|---------|----------|
| **Redis failures must not fail commands** | All Redis ops wrapped in try/catch, errors logged + treated as cache miss |
| **TTL must not expire mid-job** | Using sliding expiration, refreshed on each access |
| **Cache key must be URL-safe/unguessable** | Reuse distributed lock token (GUID from Storage) |
| **Key namespace isolation** | Lock token is unique per job; cache keys prefixed with `session:{lockToken}:` |
| **Deserialization safety** | JsonException caught, treated as cache miss, corrupt key removed |
| **Stale Instance fallback** | Documented recovery path; retry will get fresh data after SaveChanges |
| **Redis persistence unnecessary** | Removed AOF, configured maxmemory + LRU eviction |
