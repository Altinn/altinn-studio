using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that
    /// </summary>
    public class ResourceAdmController : Controller
    {
        private readonly ISourceControl _sourceControl;

        public ResourceAdmController(ISourceControl sourceControl)
        {
            _sourceControl = sourceControl;
        }

        [Route(
            "/resourceadm/{org}/{repo:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/{*AllValues}"
        )]
        public async Task<IActionResult> Index(string org, string repo)
        {
            await _sourceControl.VerifyCloneExists(org, repo);
            ViewBag.App = "resourceadm";
            return View();
        }
    }
}
