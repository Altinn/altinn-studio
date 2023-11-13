using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that
    /// </summary>
    public class ContactController : Controller
    {
        public ContactController()
        {
        }


        [Route("/contact")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
