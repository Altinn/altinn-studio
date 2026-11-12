using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

internal sealed class AssistantWorkflowService(
    IChatService chatService,
    ICanUseAiAssistantEvaluator canUseAiAssistantEvaluator,
    IAssistantWebSocketService webSocketService,
    IApiKeyService apiKeyService,
    IAssistantServiceClient assistantClient,
    IOptions<ServiceRepositorySettings> serviceRepositorySettings,
    TimeProvider timeProvider,
    ILogger<AssistantWorkflowService> logger
) : IAssistantWorkflowService
{
    private static readonly TimeSpan s_apiKeyLifetime = TimeSpan.FromMinutes(20);

    public async Task<AssistantWorkflowStartResult> StartWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        StartAssistantWorkflowRequest request,
        CancellationToken cancellationToken
    )
    {
        SessionAccess access = await OpenSession(editingContext, threadId, cancellationToken);
        if (access is not { Status: AssistantWorkflowStatus.Success, CostOrg: { } costOrg })
        {
            return new AssistantWorkflowStartResult(access.Status);
        }

        IReadOnlyList<AssistantWorkflowAttachment> attachments = await ReadAttachments(
            request.Attachments,
            cancellationToken
        );
        string apiKey = await CreateApiKey(editingContext.Developer, cancellationToken);

        logger.LogInformation(
            "Starting Assistant workflow for user: {Developer}, session: {SessionId}",
            editingContext.Developer,
            threadId
        );
        JsonElement response = await assistantClient.StartWorkflow(
            new AssistantWorkflowStartRequest(
                SessionId: threadId.ToString(),
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
        return new AssistantWorkflowStartResult(AssistantWorkflowStatus.Success, response);
    }

    public async Task<AssistantWorkflowStatus> CancelWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        SessionAccess access = await OpenSession(editingContext, threadId, cancellationToken);
        if (access.Status != AssistantWorkflowStatus.Success)
        {
            return access.Status;
        }

        await assistantClient.CancelWorkflow(editingContext.Developer, threadId.ToString(), cancellationToken);

        logger.LogInformation("Session {SessionId} cancelled by {Developer}", threadId, editingContext.Developer);
        return AssistantWorkflowStatus.Success;
    }

    public async Task<AssistantWorkflowStatus> RespondToPermission(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    )
    {
        SessionAccess access = await OpenSession(editingContext, threadId, cancellationToken);
        if (access.Status != AssistantWorkflowStatus.Success)
        {
            return access.Status;
        }

        await assistantClient.RespondToPermission(
            editingContext.Developer,
            threadId.ToString(),
            requestId,
            granted,
            cancellationToken
        );

        logger.LogInformation(
            "Permission request {RequestId} in session {SessionId} answered by {Developer}: granted={Granted}",
            requestId,
            threadId,
            editingContext.Developer,
            granted
        );
        return AssistantWorkflowStatus.Success;
    }

    // Checks that the developer may use the assistant and owns the thread, and then sends a session frame on this
    // replica's connection. The assistant service sends events only on a connection that has received one, and this
    // connection may have none, such as when it opened after the replica or the assistant service restarted.
    private async Task<SessionAccess> OpenSession(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        string? costOrg = await canUseAiAssistantEvaluator.ResolveCostOrg(editingContext.Org, editingContext.Repo);
        if (costOrg is null)
        {
            logger.LogWarning(
                "User {Developer} was denied assistant access for org {Org}",
                editingContext.Developer,
                editingContext.Org
            );
            return new SessionAccess(AssistantWorkflowStatus.Forbidden);
        }

        if (!await chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext, cancellationToken))
        {
            return new SessionAccess(AssistantWorkflowStatus.NotFound);
        }

        await webSocketService.RegisterSessionAsync(threadId.ToString(), editingContext.Developer);
        return new SessionAccess(AssistantWorkflowStatus.Success, costOrg);
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

    private async Task<string> CreateApiKey(string developer, CancellationToken cancellationToken)
    {
        var (rawKey, _) = await apiKeyService.CreateAsync(
            developer,
            $"assistant-{Guid.NewGuid()}",
            ApiKeyType.System,
            timeProvider.GetUtcNow().Add(s_apiKeyLifetime),
            cancellationToken: cancellationToken
        );
        return rawKey;
    }

    private string GetRepoUrl(AltinnRepoEditingContext editingContext) =>
        $"{serviceRepositorySettings.Value.RepositoryBaseURL}/{editingContext.Org}/{editingContext.Repo}.git";

    // CostOrg is set when Status is Success.
    private sealed record SessionAccess(AssistantWorkflowStatus Status, string? CostOrg = null);
}
