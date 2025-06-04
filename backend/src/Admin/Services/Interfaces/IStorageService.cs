using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IStorageService
{
    public Task<List<Instance>> GetInstances(string org, string env, string app);
}
