using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Helpers.Extensions;
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

    public async Task<AssistantWorkflowStatus> StartWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        StartAssistantWorkflowRequest request,
        CancellationToken cancellationToken
    )
    {
        SessionAccess access = await OpenSession(editingContext, threadId, cancellationToken);
        if (!access.IsGranted)
        {
            return access.Status;
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
        await assistantClient.StartWorkflow(
            new AssistantWorkflowStartRequest(
                SessionId: threadId.ToString(),
                Goal: request.Goal,
                RepoUrl: GetRepoUrl(editingContext),
                Branch: request.Branch,
                AllowAppChanges: request.AllowAppChanges,
                CostOrg: access.CostOrg,
                Attachments: attachments
            ),
            editingContext.Developer,
            apiKey,
            cancellationToken
        );
        return AssistantWorkflowStatus.Success;
    }

    public async Task<AssistantWorkflowStatus> CancelWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        SessionAccess access = await OpenSession(editingContext, threadId, cancellationToken);
        if (!access.IsGranted)
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
        if (!access.IsGranted)
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

    // The assistant service sends the developer's events on the connection that registered a session last. After a
    // restart of the assistant service or of the replica that had that connection, no connection gets the events
    // until a command registers a session again.
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
            return SessionAccess.Refused(AssistantWorkflowStatus.Forbidden);
        }

        if (!await chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext, cancellationToken))
        {
            return SessionAccess.Refused(AssistantWorkflowStatus.NotFound);
        }

        await webSocketService.RegisterSessionAsync(threadId.ToString(), editingContext.Developer);
        return SessionAccess.Granted(costOrg);
    }

    private static async Task<IReadOnlyList<AssistantWorkflowAttachment>> ReadAttachments(
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken
    )
    {
        var attachments = new List<AssistantWorkflowAttachment>(files.Count);
        foreach (IFormFile file in files)
        {
            byte[] content = new byte[file.Length];
            await using (Stream stream = file.OpenReadStream())
            {
                await stream.ReadExactlyAsync(content, cancellationToken);
            }

            attachments.Add(new AssistantWorkflowAttachment(file.FileName, file.ContentType, file.Length, content));
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
        new Uri(serviceRepositorySettings.Value.RepositoryBaseURL)
            .Append(editingContext.Org, $"{editingContext.Repo}.git")
            .ToString();

    private sealed class SessionAccess
    {
        private SessionAccess(AssistantWorkflowStatus status, string? costOrg)
        {
            Status = status;
            CostOrg = costOrg;
        }

        public AssistantWorkflowStatus Status { get; }

        public string? CostOrg { get; }

        [MemberNotNullWhen(true, nameof(CostOrg))]
        public bool IsGranted => CostOrg is not null;

        public static SessionAccess Granted(string costOrg) => new(AssistantWorkflowStatus.Success, costOrg);

        public static SessionAccess Refused(AssistantWorkflowStatus status) =>
            status == AssistantWorkflowStatus.Success
                ? throw new ArgumentOutOfRangeException(nameof(status), status, "A refusal needs a refused status.")
                : new(status, null);
    }
}
