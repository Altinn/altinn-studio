using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that
    /// </summary>
    public class ResourceAdmController : Controller
    {
        [Route("/resourceadm/{*AllValues}")]
        public IActionResult Index(string org, string repo)
        {
            return View();
        }
    }
}
