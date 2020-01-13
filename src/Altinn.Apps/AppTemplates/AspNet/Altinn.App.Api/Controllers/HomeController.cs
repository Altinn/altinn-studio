using System;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    public class HomeController : Controller
    {
        private readonly IAntiforgery _antiforgery;

        public HomeController(IAntiforgery antiforgery)
        {
            _antiforgery = antiforgery;
        }

        [Route("{org}/{app}/")]
        [Route("{org}/{app}/{instanceId}")]
        public IActionResult Index([FromRoute] string org, [FromRoute] string app, [FromRoute] Guid? instanceId)
        {
            // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            HttpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken, new CookieOptions
            {
                HttpOnly = false // Make this cookie readable by Javascript.
            });

            ViewBag.org = org;
            ViewBag.app = app;
            return PartialView("Index");
        }
    }
}
