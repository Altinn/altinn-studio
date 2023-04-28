using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that 
    /// </summary>
    public class ResourceAdmController : Controller
    {
        [Route("/resourceadm/{org}/{repo:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/{*AllValues}")]
        public IActionResult Index(string org, string repo)
        {
            return View();
        }
    }
}
