using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IEnvironmentsService
{
    /// <summary>
    /// Gets list of environments
    /// </summary>
    /// <returns>List of environments</returns>
    Task<List<EnvironmentModel>> GetEnvironments();

    Task<IEnumerable<EnvironmentModel>> GetOrganizationEnvironments(string org);

    Task<Uri> CreatePlatformUri(string envName);

    Task<Uri> GetAppClusterUri(string org, string envName);

    Task<string> GetHostNameByEnvName(string envName);
}
