using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class InstanceEventClientMock : IInstanceEventClient
{
    public Task<string> SaveInstanceEvent(
        object dataToSerialize,
        string org,
        string app,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        return Task.FromResult(Guid.NewGuid().ToString());
    }

    public Task<List<InstanceEvent>> GetInstanceEvents(
        string instanceId,
        string instanceOwnerPartyId,
        string org,
        string app,
        string[] eventTypes,
        string from,
        string to,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        throw new NotImplementedException();
    }
}
