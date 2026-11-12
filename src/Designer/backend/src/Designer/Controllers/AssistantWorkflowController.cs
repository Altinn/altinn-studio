using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Mime;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Starts, cancels and answers the assistant's workflow in a developer's chat thread.
/// The workflow's events reach the browser through the assistant's SignalR hub.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route(
    "designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/assistant/threads/{threadId:guid}/workflow"
)]
public class AssistantWorkflowController(
    IChatService chatService,
    ICanUseAiAssistantEvaluator canUseAiAssistantEvaluator,
    IAssistantWebSocketService webSocketService,
    IApiKeyService apiKeyService,
    IAssistantServiceClient assistantClient,
    IOptions<ServiceRepositorySettings> serviceRepositorySettings,
    ILogger<AssistantWorkflowController> logger
) : ControllerBase
{
    // The load balancer rejects larger request bodies.
    private const long MaxRequestBytes = 50 * 1024 * 1024;
    private const long MaxAttachmentBytes = 20 * 1024 * 1024;

    private static readonly TimeSpan s_apiKeyLifetime = TimeSpan.FromMinutes(20);

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
    /// <returns>The assistant service's answer, which says whether it accepted the request.</returns>
    [HttpPost]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
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

        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        string? costOrg = await canUseAiAssistantEvaluator.ResolveCostOrg(org, app);
        if (costOrg is null)
        {
            logger.LogWarning(
                "User {Developer} was denied assistant access for org {Org}",
                editingContext.Developer,
                org
            );
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        if (!await chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext, cancellationToken))
        {
            return NotFound();
        }

        string sessionId = threadId.ToString();
        IReadOnlyList<AssistantWorkflowAttachment> attachments = await ReadAttachments(
            request.Attachments,
            cancellationToken
        );
        await StreamSessionEvents(sessionId, editingContext.Developer);
        string apiKey = await CreateApiKey(editingContext.Developer, cancellationToken);

        logger.LogInformation(
            "Starting Assistant workflow for user: {Developer}, session: {SessionId}",
            editingContext.Developer,
            sessionId
        );
        JsonElement response = await assistantClient.StartWorkflow(
            new AssistantWorkflowStartRequest(
                SessionId: sessionId,
                Goal: request.Goal,
                RepoUrl: GetRepoUrl(editingContext),
                Branch: request.Branch,
                AllowAppChanges: request.AllowAppChanges,
                CostOrg: costOrg,
                Attachments: attachments
            ),
            editingContext.Developer,
            apiKey,
            cancellationToken
        );
        // Newtonsoft.Json, which formats this controller's results, cannot write a JsonElement.
        return Content(response.GetRawText(), MediaTypeNames.Application.Json);
    }

    /// <summary>
    /// Cancels the workflow that runs in the thread.
    /// </summary>
    [HttpPost("cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelWorkflow(
        string org,
        string app,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        if (!await chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext, cancellationToken))
        {
            return NotFound();
        }

        string sessionId = threadId.ToString();
        await StreamSessionEvents(sessionId, editingContext.Developer);
        await assistantClient.CancelWorkflow(editingContext.Developer, sessionId, cancellationToken);

        logger.LogInformation("Session {SessionId} cancelled by {Developer}", sessionId, editingContext.Developer);
        return NoContent();
    }

    /// <summary>
    /// Delivers the developer's answer when the workflow in the thread asks for permission to change the app.
    /// </summary>
    [HttpPost("permission")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RespondToPermission(
        string org,
        string app,
        Guid threadId,
        [FromBody] AssistantPermissionResponseRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        if (!await chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext, cancellationToken))
        {
            return NotFound();
        }

        string sessionId = threadId.ToString();
        await StreamSessionEvents(sessionId, editingContext.Developer);
        await assistantClient.RespondToPermission(
            editingContext.Developer,
            sessionId,
            request.RequestId,
            request.Granted,
            cancellationToken
        );

        logger.LogInformation(
            "Permission request {RequestId} in session {SessionId} answered by {Developer}: granted={Granted}",
            request.RequestId,
            sessionId,
            editingContext.Developer,
            request.Granted
        );
        return NoContent();
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

    private static async Task<IReadOnlyList<AssistantWorkflowAttachment>> ReadAttachments(
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken
    )
    {
        var attachments = new List<AssistantWorkflowAttachment>(files.Count);
        foreach (IFormFile file in files)
        {
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream, cancellationToken);
            string dataUrl = $"data:{file.ContentType};base64,{Convert.ToBase64String(memoryStream.ToArray())}";
            attachments.Add(new AssistantWorkflowAttachment(file.FileName, file.ContentType, file.Length, dataUrl));
        }

        return attachments;
    }

    // The assistant service sends events only on a connection that has received a session frame. This replica's
    // connection may have none, such as when it opened after the replica or the assistant service restarted.
    private Task StreamSessionEvents(string sessionId, string developer) =>
        webSocketService.RegisterSessionAsync(sessionId, developer);

    private async Task<string> CreateApiKey(string developer, CancellationToken cancellationToken)
    {
        var (rawKey, _) = await apiKeyService.CreateAsync(
            developer,
            $"assistant-{Guid.NewGuid()}",
            ApiKeyType.System,
            DateTimeOffset.UtcNow.Add(s_apiKeyLifetime),
            cancellationToken: cancellationToken
        );
        return rawKey;
    }

    private string GetRepoUrl(AltinnRepoEditingContext editingContext) =>
        $"{serviceRepositorySettings.Value.RepositoryBaseURL}/{editingContext.Org}/{editingContext.Repo}.git";

    private AltinnRepoEditingContext GetEditingContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }
}
