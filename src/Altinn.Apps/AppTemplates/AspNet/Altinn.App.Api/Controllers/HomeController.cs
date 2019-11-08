using System;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    public class HomeController : Controller
    {
        [Route("{org}/{app}/")]
        [Route("{org}/{app}/{instanceId}")]
        public IActionResult Index([FromRoute] string org, [FromRoute] string app, [FromRoute] Guid? instanceId)
        {
            ViewBag.org = org;
            ViewBag.app = app;
            return PartialView("Index");
        }
    }
}
