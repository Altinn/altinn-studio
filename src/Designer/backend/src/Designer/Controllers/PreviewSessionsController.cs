using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.PreviewService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Starts preview sessions. The preview service shows the app on a domain of its own, so content from the app's
/// repository never runs on Studio's.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/preview-sessions")]
public class PreviewSessionsController(IPreviewServiceClient previewServiceClient) : ControllerBase
{
    /// <summary>
    /// Starts a session that previews the developer's own working copy of the app.
    /// </summary>
    /// <remarks>
    /// Like Designer's other endpoints for a working copy, this doesn't ask Gitea whether the developer may still read
    /// the app. The developer comes from the login, so they can preview only their own working copy, which they can
    /// already read and edit in Designer.
    /// </remarks>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The URL that opens the app in preview.</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreviewSessionResponse>> StartSession(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        Uri? url = await previewServiceClient.StartSession(developer, org, app, cancellationToken);
        return url is null ? NotFound() : Ok(new PreviewSessionResponse(url));
    }
}
