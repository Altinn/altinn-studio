using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// The interface for business logic service for kubernetes wrapper
    /// </summary>
    public interface IKubernetesWrapperService
    {
        /// <summary>
        /// Gets kubernetes deployments
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <returns>List of kubernetes deployments</returns>
        Task<List<KubernetesDeployment>> GetAsync(string org, string app);
    }
}
