using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IApplicationsService
{
    public Task<List<RunningApplication>> GetRunningApplications(string org);
}
