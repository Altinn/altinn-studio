using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.Assistant;

/// <summary>
/// Client interface for messages sent from the Assistant hub to frontend clients
/// </summary>
public interface IAssistantClient
{
    /// <summary>
    /// Receives a message from the Assistant agent
    /// </summary>
    /// <param name="message">The message data from the agent</param>
    Task ReceiveAgentMessage(object message);
}
