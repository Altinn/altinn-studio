using Altinn.Platform.Storage.Interface.Models;

namespace Admin.Services.Interfaces;

public interface IStorageService
{
    public Task<List<Instance>> GetInstances(string org, string env, string app);
}
