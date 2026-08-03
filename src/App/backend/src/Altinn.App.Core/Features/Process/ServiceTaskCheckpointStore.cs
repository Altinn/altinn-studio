using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Backing store for <see cref="ServiceTaskCheckpoints"/>. The runtime wires the Storage-backed
/// implementation; the in-memory default on <see cref="ServiceTaskContext"/> gives app code that
/// constructs a context in unit tests working checkpoint semantics without any setup.
/// </summary>
internal interface IServiceTaskCheckpointStore
{
    Task Set(string key, string value, CancellationToken ct);
    Task<string?> Get(string key, CancellationToken ct);
}

/// <summary>
/// Creates the checkpoint store backing one service-task attempt. Stores are stateful per attempt
/// (read caching, snapshot mirroring), so the DI seam is this factory, not the store itself. The
/// runtime registers <see cref="StorageServiceTaskCheckpointStoreFactory"/> as the default.
/// </summary>
/// <remarks>
/// <c>Create</c> takes the execution's <see cref="IInstanceDataAccessor"/> rather than an
/// <see cref="Instance"/> deliberately: a store that mirrors writes must decorate the live execution
/// snapshot — the one later commands re-sign into the state blob — and the accessor guarantees that
/// identity where a detached or re-fetched <see cref="Instance"/> would let the mirror drift. It is
/// the accessor, not the <see cref="IInstanceDataMutator"/>, because checkpoints live outside the
/// save-on-success unit of work: a store must never be handed the power to mutate it.
/// </remarks>
internal interface IServiceTaskCheckpointStoreFactory
{
    IServiceTaskCheckpointStore Create(IInstanceDataAccessor instanceDataAccessor, string serviceTaskType);
}

/// <summary>
/// Default factory: checkpoints live in Storage as instance data values.
/// </summary>
internal sealed class StorageServiceTaskCheckpointStoreFactory(IInstanceClient instanceClient)
    : IServiceTaskCheckpointStoreFactory
{
    public IServiceTaskCheckpointStore Create(IInstanceDataAccessor instanceDataAccessor, string serviceTaskType) =>
        new StorageServiceTaskCheckpointStore(instanceClient, instanceDataAccessor.Instance, serviceTaskType);
}

/// <summary>
/// Checkpoints as instance data values, keyed <c>serviceTask:{taskType}:{key}</c>.
/// </summary>
/// <remarks>
/// The two halves are deliberately asymmetric. <c>Set</c> writes to Storage immediately — outside the
/// save-on-success unit of work, so the evidence survives an attempt that fails after a side effect —
/// and mirrors the value onto the execution snapshot's instance, keeping the re-signed state blob
/// coherent for later commands. <c>Get</c> reads through to Storage (one fetch per attempt) rather
/// than trusting that snapshot: a failed attempt writes no state blob, so its checkpoint is visible
/// to the retry only in Storage. Reads-your-writes within the attempt without refetching.
/// </remarks>
internal sealed class StorageServiceTaskCheckpointStore : IServiceTaskCheckpointStore
{
    private readonly IInstanceClient _instanceClient;
    private readonly Instance _instance;
    private readonly string _prefix;
    private readonly Dictionary<string, string> _written = new(StringComparer.Ordinal);
    private Dictionary<string, string>? _fetched;

    public StorageServiceTaskCheckpointStore(IInstanceClient instanceClient, Instance instance, string serviceTaskType)
    {
        _instanceClient = instanceClient;
        _instance = instance;
        _prefix = $"serviceTask:{serviceTaskType}:";
    }

    public async Task Set(string key, string value, CancellationToken ct)
    {
        string fullKey = _prefix + key;
        var instanceId = new InstanceIdentifier(_instance);
        await _instanceClient.UpdateDataValues(
            instanceId.InstanceOwnerPartyId,
            instanceId.InstanceGuid,
            new DataValues { Values = new Dictionary<string, string?> { [fullKey] = value } },
            StorageAuthenticationMethod.ServiceOwner(),
            ct
        );

        _instance.DataValues ??= [];
        _instance.DataValues[fullKey] = value;
        _written[fullKey] = value;
    }

    public async Task<string?> Get(string key, CancellationToken ct)
    {
        string fullKey = _prefix + key;
        if (_written.TryGetValue(fullKey, out string? ownWrite))
        {
            return ownWrite;
        }

        if (_fetched is null)
        {
            Instance fresh = await _instanceClient.GetInstance(
                _instance,
                StorageAuthenticationMethod.ServiceOwner(),
                ct
            );
            _fetched = fresh.DataValues ?? [];
        }

        return _fetched.TryGetValue(fullKey, out string? value) ? value : null;
    }
}

/// <summary>
/// Dictionary-backed store used when a <see cref="ServiceTaskContext"/> is constructed outside the
/// runtime (app unit tests): checkpoints round-trip within the context, nothing is persisted.
/// </summary>
internal sealed class InMemoryServiceTaskCheckpointStore : IServiceTaskCheckpointStore
{
    private readonly Dictionary<string, string> _values = new(StringComparer.Ordinal);

    public Task Set(string key, string value, CancellationToken ct)
    {
        _values[key] = value;
        return Task.CompletedTask;
    }

    public Task<string?> Get(string key, CancellationToken ct) =>
        Task.FromResult(_values.TryGetValue(key, out string? value) ? value : null);
}
