using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IEnvironmentsService
{
    /// <summary>
    /// Gets list of environments
    /// </summary>
    /// <returns>List of environments</returns>
    Task<EnvironmentModel[]> GetEnvironments();

    Task<Uri> CreatePlatformUri(string envName);

    Task<string> GetHostNameByEnvName(string envName);

    Task<EnvironmentModel> GetEnvModelByName(string envName);
}
