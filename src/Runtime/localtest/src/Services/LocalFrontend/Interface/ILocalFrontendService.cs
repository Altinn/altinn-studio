using LocalTest.Models;

namespace LocalTest.Services.LocalFrontend.Interface;

public interface ILocalFrontendService
{
    public Task<List<LocalFrontendInfo>> GetLocalFrontendDevPorts();
}