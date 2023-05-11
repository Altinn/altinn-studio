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
        /// <returns></returns>
        Task<ActionResult> PublishServiceResource(ServiceResource serviceResource);
    }
}
