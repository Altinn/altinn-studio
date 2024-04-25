using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class InstanceEventClientMock : IInstanceEventClient
{
    public Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app)
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
        string to
    )
    {
        throw new NotImplementedException();
    }
}
