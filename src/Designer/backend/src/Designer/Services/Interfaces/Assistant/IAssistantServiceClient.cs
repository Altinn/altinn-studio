using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Assistant;

namespace Altinn.Studio.Designer.Services.Interfaces.Assistant;

/// <summary>
/// HTTP client for forwarding requests to the Assistant service.
/// </summary>
public interface IAssistantServiceClient
{
    /// <summary>
    /// Records a user thumbs-up/thumbs-down on an assistant message as a Langfuse score against the given trace.
    /// </summary>
    Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Removes the Langfuse score holding a user's thumbs-up/thumbs-down for the given trace.
    /// </summary>
    Task ClearFeedbackAsync(string developer, string traceId, CancellationToken cancellationToken);

    /// <summary>
    /// Triggers deletion of Langfuse traces older than the assistant service's retention window.
    /// </summary>
    Task TriggerTraceCleanupAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Starts a workflow in the assistant service.
    /// </summary>
    /// <param name="request">The developer's message and attachments, and where the assistant works.</param>
    /// <param name="developer">The developer that the workflow runs for.</param>
    /// <param name="apiKey">The key that the assistant clones and pushes the repository with.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <returns>The assistant service's answer, which says whether it accepted the request.</returns>
    Task<JsonElement> StartWorkflow(
        AssistantWorkflowStartRequest request,
        string developer,
        string apiKey,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Cancels the running workflow of a session.
    /// </summary>
    Task CancelWorkflow(string developer, string sessionId, CancellationToken cancellationToken);

    /// <summary>
    /// Delivers the developer's answer to a permission request from a running workflow.
    /// The assistant pauses a read-only session when the model tries to change the app, and waits for the answer.
    /// </summary>
    Task RespondToPermission(
        string developer,
        string sessionId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    );
}
