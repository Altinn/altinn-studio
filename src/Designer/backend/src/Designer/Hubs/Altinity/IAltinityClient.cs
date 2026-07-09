using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.Altinity;

/// <summary>
/// Client interface for messages sent from the Altinity hub to frontend clients
/// </summary>
public interface IAltinityClient
{
    /// <summary>
    /// Receives a message from the Altinity agent
    /// </summary>
    /// <param name="message">The message data from the agent</param>
    Task ReceiveAgentMessage(object message);
}
