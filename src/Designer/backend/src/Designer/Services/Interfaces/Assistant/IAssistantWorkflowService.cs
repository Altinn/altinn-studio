using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Assistant;

/// <summary>
/// Starts, cancels and answers the assistant workflow in a chat thread.
/// Each command first makes sure that the developer can use the assistant in the repository and owns the thread.
/// </summary>
public interface IAssistantWorkflowService
{
    /// <summary>
    /// Sends the developer's message and its attachments to the assistant, which starts a workflow in the thread.
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
    /// Delivers the developer's answer when the workflow in the thread asks for permission to change the app.
    /// </summary>
    Task<AssistantWorkflowStatus> RespondToPermission(
        AltinnRepoEditingContext editingContext,
        Guid threadId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    );
}
