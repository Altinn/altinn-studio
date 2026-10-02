using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Helpers.Extensions;

public static class AppVersionServiceExtensions
{
    /// <summary>
    /// Returns whether the developer making the request edits a v9 app, see <see cref="IAppVersionService.IsV9App"/>.
    /// </summary>
    public static bool IsV9App(
        this IAppVersionService appVersionService,
        HttpContext httpContext,
        string org,
        string repo
    ) =>
        appVersionService.IsV9App(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                repo,
                AuthenticationHelper.GetDeveloperUserName(httpContext)
            )
        );
}
