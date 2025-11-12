using Altinn.App.Clients.Fiks.FiksIO.Models;

namespace Altinn.App.Clients.Fiks.FiksIO;

/// <summary>
/// Contains logic for interacting with Fiks IO to send and receive messages.
/// </summary>
public interface IFiksIOClient : IAsyncDisposable
{
    /// <summary>
    /// The non-sensitive settings for the account.
    /// </summary>
    IFiksIOAccountSettings AccountSettings { get; }

    /// <summary>
    /// Indicates whether the client is healthy or not.
    /// </summary>
    Task<bool> IsHealthy();

    /// <summary>
    /// Forces a reconnection to Fiks IO.
    /// </summary>
    Task Reconnect();

    /// <summary>
    /// Registers a listener to invoke when a message is received.
    /// </summary>
    /// <param name="listener">The event handler to register.</param>
    Task OnMessageReceived(Func<FiksIOReceivedMessage, Task> listener);

    /// <summary>
    /// Sends a Fiks IO message.
    /// </summary>
    /// <param name="request">The message request.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    Task<FiksIOMessageResponse> SendMessage(
        FiksIOMessageRequest request,
        CancellationToken cancellationToken = default
    );
}
