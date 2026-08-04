using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Default <see cref="IServiceTaskCheckpointsFactory"/>: checkpoints live in Storage as instance
/// data values.
/// </summary>
internal sealed class StorageServiceTaskCheckpointsFactory(IInstanceClient instanceClient)
    : IServiceTaskCheckpointsFactory
{
    public IServiceTaskCheckpoints Create(
        IInstanceDataAccessor instanceDataAccessor,
        string serviceTaskType,
        CancellationToken cancellationToken
    ) =>
        new StorageServiceTaskCheckpoints(
            instanceClient,
            instanceDataAccessor.Instance,
            serviceTaskType,
            cancellationToken
        );
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
internal sealed class StorageServiceTaskCheckpoints : IServiceTaskCheckpoints
{
    private readonly IInstanceClient _instanceClient;
    private readonly Instance _instance;
    private readonly string _prefix;
    private readonly CancellationToken _cancellationToken;
    private readonly Dictionary<string, string> _written = new(StringComparer.Ordinal);
    private Dictionary<string, string>? _fetched;

    public StorageServiceTaskCheckpoints(
        IInstanceClient instanceClient,
        Instance instance,
        string serviceTaskType,
        CancellationToken cancellationToken
    )
    {
        _instanceClient = instanceClient;
        _instance = instance;
        _prefix = $"serviceTask:{serviceTaskType}:";
        _cancellationToken = cancellationToken;
    }

    public async Task Set(string key, string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentNullException.ThrowIfNull(value);

        string fullKey = _prefix + key;
        var instanceId = new InstanceIdentifier(_instance);
        await _instanceClient.UpdateDataValues(
            instanceId.InstanceOwnerPartyId,
            instanceId.InstanceGuid,
            new DataValues { Values = new Dictionary<string, string?> { [fullKey] = value } },
            StorageAuthenticationMethod.ServiceOwner(),
            _cancellationToken
        );

        _instance.DataValues ??= [];
        _instance.DataValues[fullKey] = value;
        _written[fullKey] = value;
    }

    public async Task<string?> Get(string key)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

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
                _cancellationToken
            );
            _fetched = fresh.DataValues ?? [];
        }

        return _fetched.TryGetValue(fullKey, out string? value) ? value : null;
    }
}
