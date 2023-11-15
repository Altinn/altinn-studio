using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that
    /// </summary>
    public class StudioRootController : Controller
    {
        public StudioRootController()
        {
        }

        [Route("/{*AllValues}")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
