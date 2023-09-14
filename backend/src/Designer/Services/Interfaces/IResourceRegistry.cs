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
    }
}
