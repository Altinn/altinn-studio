using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IStorageService
{
    public Task<List<SimpleInstance>> GetInstances(string org, string env, string app);

    public Task<Instance> GetInstance(string org, string env, string instanceOwnerPartyId, string instanceId);
}
