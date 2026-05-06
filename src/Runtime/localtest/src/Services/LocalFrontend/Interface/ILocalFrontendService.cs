#nullable enable
using LocalTest.Models;

namespace LocalTest.Services.LocalFrontend.Interface;

public interface ILocalFrontendService
{
    public Task<List<LocalFrontendInfo>> GetLocalFrontendDevPorts();

    public string DescribeFrontendUrl(string? frontendUrl);
}
