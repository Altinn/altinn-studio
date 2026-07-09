using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

internal sealed class GuardedInstanceClient(IStorageInstanceClient inner, IInstanceDataMutatorStorageAccessGuard guard)
    : IInstanceClient
{
    private const string ClientName = nameof(IInstanceClient);

    public Task<Instance> GetInstance(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.GetInstance(app, org, instanceOwnerPartyId, instanceId, authenticationMethod, ct));

    public Task<Instance> GetInstance(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.GetInstance(instance, authenticationMethod, ct));

    public Task<List<Instance>> GetInstances(
        Dictionary<string, StringValues> queryParams,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.GetInstances(queryParams, authenticationMethod, ct));

    public Task<Instance> UpdateProcess(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.UpdateProcess(instance, authenticationMethod, ct));

    public Task<Instance> UpdateProcessAndEvents(
        Instance instance,
        List<InstanceEvent> events,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.UpdateProcessAndEvents(instance, events, authenticationMethod, ct));

    public Task<Instance> CreateInstance(
        string org,
        string app,
        Instance instanceTemplate,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.CreateInstance(org, app, instanceTemplate, authenticationMethod, ct));

    public Task<Instance> AddCompleteConfirmation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.AddCompleteConfirmation(instanceOwnerPartyId, instanceGuid, authenticationMethod, ct));

    public Task<Instance> UpdateReadStatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string readStatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) =>
        Guarded(() => inner.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, readStatus, authenticationMethod, ct));

    public Task<Instance> UpdateSubstatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Substatus substatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.UpdateSubstatus(instanceOwnerPartyId, instanceGuid, substatus, authenticationMethod, ct));

    public Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) =>
        Guarded(() =>
            inner.UpdatePresentationTexts(
                instanceOwnerPartyId,
                instanceGuid,
                presentationTexts,
                authenticationMethod,
                ct
            )
        );

    public Task<Instance> UpdateDataValues(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataValues dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) =>
        Guarded(() => inner.UpdateDataValues(instanceOwnerPartyId, instanceGuid, dataValues, authenticationMethod, ct));

    public Task<Instance> DeleteInstance(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        bool hard,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => Guarded(() => inner.DeleteInstance(instanceOwnerPartyId, instanceGuid, hard, authenticationMethod, ct));

    private Task<T> Guarded<T>(Func<Task<T>> action)
    {
        guard.ThrowIfActive(ClientName);
        return action();
    }
}
