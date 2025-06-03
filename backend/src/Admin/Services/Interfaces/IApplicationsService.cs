using Admin.Models;

namespace Admin.Services.Interfaces;

public interface IApplicationsService
{
    public Task<List<RunningApplication>> GetRunningApplications(string org);
}
