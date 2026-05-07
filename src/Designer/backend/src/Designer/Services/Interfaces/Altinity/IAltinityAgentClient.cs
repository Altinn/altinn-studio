using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces.Altinity;

/// <summary>
/// HTTP client for forwarding request/response actions from the Designer backend to the
/// Altinity agents service. Streaming events use the persistent WebSocket
/// (<see cref="IAltinityWebSocketService"/>); one-shot requests like user feedback go here.
/// </summary>
public interface IAltinityAgentClient
{
    /// <summary>
    /// Records a user thumbs-up/thumbs-down on an assistant message as a Langfuse score
    /// against the given trace, with an optional free-text comment.
    /// </summary>
    Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken = default
    );
}
