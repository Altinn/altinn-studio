using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
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
    /// <param name="party">
    /// Whom the user in preview acts for: <c>person</c>, themself, which is the default, or <c>organization</c>.
    /// </param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The URL that opens the app in preview.</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreviewSessionResponse>> StartSession(
        string org,
        string app,
        [FromQuery] string? party,
        CancellationToken cancellationToken
    )
    {
        PreviewParty? previewParty = party switch
        {
            null or "person" => PreviewParty.Person,
            "organization" => PreviewParty.Organization,
            _ => null,
        };
        if (previewParty is null)
        {
            return BadRequest();
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        Uri? url = await previewServiceClient.StartSession(developer, org, app, previewParty.Value, cancellationToken);
        return url is null ? NotFound() : Ok(new PreviewSessionResponse(url));
    }

    /// <summary>
    /// Creates an instance at a task in one of the developer's preview sessions, so the editor can show the task the
    /// developer works on.
    /// </summary>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="request">The session and the task.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The instance's ID.</returns>
    [HttpPost("instances")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreviewInstanceResponse>> CreateInstance(
        string org,
        string app,
        [FromBody] CreatePreviewInstanceRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string? instanceId = await previewServiceClient.CreateInstance(
            developer,
            org,
            app,
            request.SessionUrl,
            request.TaskId,
            cancellationToken
        );
        return instanceId is null ? NotFound() : Ok(new PreviewInstanceResponse(instanceId));
    }

    /// <summary>
    /// The form data of an instance in one of the developer's preview sessions, so the developer can change data that
    /// the app's code would fill in. The request has the session's URL, which holds its secret ID, so it is a POST.
    /// </summary>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="request">The session and the instance.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The instance's form data, by data element.</returns>
    [HttpPost("form-data")]
    [UseSystemTextJson]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreviewFormDataResponse>> ReadFormData(
        string org,
        string app,
        [FromBody] PreviewFormDataRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var dataElements = await previewServiceClient.ReadFormData(
            developer,
            org,
            app,
            request.SessionUrl,
            request.InstanceId,
            cancellationToken
        );
        return dataElements is null ? NotFound() : Ok(new PreviewFormDataResponse(dataElements));
    }

    /// <summary>
    /// Replaces the data of a form data element of an instance in one of the developer's preview sessions.
    /// </summary>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="request">The session, the instance, the data element and its new data.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    [HttpPut("form-data")]
    [UseSystemTextJson]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WriteFormData(
        string org,
        string app,
        [FromBody] WritePreviewFormDataRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        bool written = await previewServiceClient.WriteFormData(
            developer,
            org,
            app,
            request.SessionUrl,
            request.InstanceId,
            request.DataElementId,
            request.Data,
            cancellationToken
        );
        return written ? NoContent() : NotFound();
    }
}
