using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// The default MVC controller in the application
/// </summary>
[Route("[action]/{id?}")]
[Route("[controller]/[action]/{id?}")]
public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly ServiceRepositorySettings _settings;
    private readonly GeneralSettings _generalSettings;
    private readonly StudioOidcLoginSettings _studioOidcLoginSettings;

    /// <summary>
    /// Initializes a new instance of the <see cref="HomeController"/> class
    /// </summary>
    /// <param name="logger">The logger</param>
    /// <param name="repositorySettings">settings for the repository</param>
    /// <param name="generalSettings">the general settings</param>
    /// <param name="studioOidcLoginSettings">the studio oidc login settings</param>
    public HomeController(
        ILogger<HomeController> logger,
        ServiceRepositorySettings repositorySettings,
        GeneralSettings generalSettings,
        StudioOidcLoginSettings studioOidcLoginSettings
    )
    {
        _logger = logger;
        _settings = repositorySettings;
        _generalSettings = generalSettings;
        _studioOidcLoginSettings = studioOidcLoginSettings;
    }

    /// <summary>
    /// the default page for altinn studio when the user is not logged in
    /// </summary>
    /// <returns>The start page</returns>
    [Route("/")]
    [Route("/[controller]")]
    [Route("/[controller]/[action]/{id?}", Name = "DefaultNotLoggedIn")]
    public ActionResult StartPage()
    {
        bool isUserLoggedIn = User.Identity?.IsAuthenticated ?? false;

        if (isUserLoggedIn)
        {
            return LocalRedirect("/dashboard");
        }

        Response.Cookies.Delete(General.DesignerCookieName);
        Response.Cookies.Delete(_settings.GiteaCookieName);
        return View("StartPage");
    }

    /// <summary>
    /// Login
    /// </summary>
    /// <returns>The login page</returns>
    public IActionResult Login([FromQuery(Name = "redirect_to")] string redirectTo = "/")
    {
        if (!Url.IsLocalUrl(redirectTo))
        {
            redirectTo = "/";
        }

        if (User.Identity?.IsAuthenticated == true)
        {
            return LocalRedirect(redirectTo);
        }

        return Challenge(new AuthenticationProperties { RedirectUri = redirectTo });
    }

    /// <summary>
    /// Logout
    /// </summary>
    /// <returns>The logout page</returns>
    public IActionResult Logout()
    {
        HttpContext.Response.Cookies.Append(
            _generalSettings.SessionTimeoutCookieName,
            string.Empty,
            new CookieOptions { HttpOnly = true, Expires = DateTime.Now.AddDays(-10) }
        );

        if (User.Identity?.IsAuthenticated != true)
        {
            return LocalRedirect("/");
        }

        return SignOut(CookieAuthenticationDefaults.AuthenticationScheme, OpenIdConnectDefaults.AuthenticationScheme);
    }
}
