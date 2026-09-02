using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Optional app hook for the messages the archive sends back — custom bookkeeping such as copying the
/// archive's case number out of the receipt into instance data. Register an implementation with
/// <c>AddFiksArkiv().WithMessageHandler&lt;T&gt;()</c>; without one, the messages are handled by
/// <see cref="FiksArkivServiceTask"/> alone.
/// </summary>
/// <remarks>
/// Called once per message, inside the process transition the message belongs to and before the task acts
/// on it — so data staged through <c>context.InstanceDataMutator</c> is saved with the same transition that
/// stores the receipt. The task decides the outcome itself, applying <c>successHandling</c>/<c>errorHandling</c>:
/// <strong>do not move the process from here</strong> — a <c>process/next</c> is refused with <c>409</c> and
/// only stalls the shipment. A throw is retryable: the message is frozen at its position, so the next attempt
/// hands the same message to this handler again. Delivery is at least once;
/// <see cref="FiksArkivReceivedMessage.MessageId"/> is the deduplication key.
/// </remarks>
[ImplementableByApps]
public interface IFiksArkivMessageHandler
{
    /// <summary>
    /// Handles one message from the archive. See the interface remarks for the execution contract.
    /// </summary>
    /// <param name="message">The received message, with its payloads decrypted and parsed.</param>
    /// <param name="context">
    /// The executing service task's context — <c>InstanceDataMutator</c> is the durable unit of work,
    /// and <c>CancellationToken</c> bounds this attempt.
    /// </param>
    Task HandleMessage(FiksArkivReceivedMessage message, ServiceTaskContext context);
}
