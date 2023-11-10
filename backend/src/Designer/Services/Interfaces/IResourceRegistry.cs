using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IResourceRegistry
    {
        /// <summary>
        /// Pushing ServiceResource to the ResourceRegistry
        /// </summary>
        /// <param name="serviceResource">The ServiceResource that should be added to the ResourceRegistry</param>
        /// <param name="env">The environment the resource should be published to</param>
        /// <param name="policyPath">The policy that goes with the resource</param>
        /// <returns></returns>
        Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env, string policyPath = null);

        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        /// <param name="env"></param>
        /// <returns></returns>
        Task<ServiceResource> GetResource(string id, string env);

        /// <summary>
        /// Get all resources exposed by resource registry. It includeds apps and Altinn 2 servces
        /// </summary>
        /// <returns></returns>
        Task<List<ServiceResource>> GetResources(string env);

        /// <summary>
        /// Integration point for retrieving the full list of resources
        /// </summary>
        /// <returns>The resource full list of all resources if exists</returns>
        Task<List<ServiceResource>> GetResourceList(string env);
    }
}
