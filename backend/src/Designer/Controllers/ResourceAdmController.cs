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


        [Route("/resourceadm/{org}/{repo:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/{*AllValues}")]
        public IActionResult Index(string org, string repo)
        {
            _sourceControl.VerifyCloneExists(org, repo);
            return View();
        }
    }
}
