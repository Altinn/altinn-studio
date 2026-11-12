using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// The browser sends its commands for the assistant workflow to this controller.
/// It receives the workflow events through <see cref="Hubs.Assistant.AssistantProxyHub"/>.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route(
    "designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/assistant/threads/{threadId:guid}/workflow"
)]
public sealed class AssistantWorkflowController(IAssistantWorkflowService workflowService) : ControllerBase
{
    // The load balancer rejects larger request bodies.
    private const long MaxRequestBytes = 50 * 1024 * 1024;
    private const long MaxAttachmentBytes = 20 * 1024 * 1024;

    private static readonly HashSet<string> s_allowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".md",
        ".txt",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
    };

    /// <summary>
    /// Sends the developer's message and its attachments to the assistant, which starts a workflow in the thread.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(MaxRequestBytes)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> StartWorkflow(
        string org,
        string app,
        Guid threadId,
        [FromForm] StartAssistantWorkflowRequest request,
        CancellationToken cancellationToken
    )
    {
        string? attachmentError = ValidateAttachments(request.Attachments);
        if (attachmentError is not null)
        {
            return BadRequest(attachmentError);
        }

        AssistantWorkflowStatus status = await workflowService.StartWorkflow(
            GetEditingContext(org, app),
            threadId,
            request,
            cancellationToken
        );
        return ToActionResult(status);
    }

    /// <summary>
    /// Cancels the workflow that runs in the thread.
    /// </summary>
    [HttpPost("cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelWorkflow(
        string org,
        string app,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        AssistantWorkflowStatus status = await workflowService.CancelWorkflow(
            GetEditingContext(org, app),
            threadId,
            cancellationToken
        );
        return ToActionResult(status);
    }

    /// <summary>
    /// Delivers the developer's answer when the workflow in the thread asks for permission to change the app.
    /// </summary>
    [HttpPost("permission")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RespondToPermission(
        string org,
        string app,
        Guid threadId,
        [FromBody] AssistantPermissionResponseRequest request,
        CancellationToken cancellationToken
    )
    {
        AssistantWorkflowStatus status = await workflowService.RespondToPermission(
            GetEditingContext(org, app),
            threadId,
            request.RequestId,
            request.Granted,
            cancellationToken
        );
        return ToActionResult(status);
    }

    private static string? ValidateAttachments(IReadOnlyList<IFormFile> files)
    {
        foreach (IFormFile file in files)
        {
            if (file.Length == 0)
            {
                return $"The file '{file.FileName}' is empty.";
            }

            if (file.Length > MaxAttachmentBytes)
            {
                return $"The file '{file.FileName}' exceeds the {MaxAttachmentBytes / 1024 / 1024} MB limit.";
            }

            string extension = Path.GetExtension(file.FileName);
            if (!s_allowedExtensions.Contains(extension))
            {
                return $"File type '{extension}' is not allowed.";
            }
        }

        return null;
    }

    private IActionResult ToActionResult(AssistantWorkflowStatus status) =>
        status switch
        {
            AssistantWorkflowStatus.Success => NoContent(),
            AssistantWorkflowStatus.Forbidden => StatusCode(StatusCodes.Status403Forbidden),
            AssistantWorkflowStatus.NotFound => NotFound(),
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
        };

    private AltinnRepoEditingContext GetEditingContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }
}
