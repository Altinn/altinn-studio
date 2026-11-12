using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Assistant;

/// <summary>
/// Sends the developer's commands for the assistant workflow in a chat thread.
/// Each command first checks that the developer can use the assistant in the repository and owns the thread.
/// </summary>
public interface IAssistantWorkflowService
{
    /// <summary>
    /// Sends the developer's message and its attachments to the assistant.
    /// The assistant starts a workflow in the thread.
    /// </summary>
    Task<AssistantWorkflowStatus> StartWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        StartAssistantWorkflowRequest request,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Cancels the workflow that runs in the thread.
    /// </summary>
    Task<AssistantWorkflowStatus> CancelWorkflow(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Sends the developer's answer to a permission request from the workflow in the thread.
    /// </summary>
    Task<AssistantWorkflowStatus> RespondToPermission(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    );
}
