using System.Threading.Tasks;
using AltinnCore.Designer.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for creating, getting and updating releases
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/{org}/{app}/[controller]")]
    public class ReleasesController : ControllerBase
    {
        /// <summary>
        /// Gets a certain number of releases
        /// </summary>
        /// <param name="query">Release query model</param>
        /// <returns></returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public Task<string> Get([FromQuery]ReleaseQueryModel query)
        {
            string org = RouteData.Values["org"].ToString();
            string app = RouteData.Values["app"].ToString();
            return Task.FromResult(string.Empty);
        }
    }
}
