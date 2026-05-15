using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces.Altinity;

/// <summary>
/// HTTP client for forwarding requests to the Altinity agents service.
/// </summary>
public interface IAltinityAgentClient
{
    /// <summary>
    /// Records a user thumbs-up/thumbs-down on an assistant message as a Langfuse score against the given trace.
    /// </summary>
    Task SendFeedbackAsync(string developer, string traceId, bool thumbsUp, string? comment);
}
