using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for sending eFormidling shipments and following them to
/// delivery. A default implementation is registered by <c>AddEFormidling()</c>; replace it by
/// registering your own implementation of this interface.
/// </summary>
public interface IEFormidlingService
{
    /// <summary>
    /// Send the eFormidling shipment with explicit configuration context.
    /// </summary>
    /// <remarks>
    /// <strong>Must be idempotent.</strong> The send runs as its own workflow-engine step and may be
    /// retried, so a repeated call for the same instance must converge rather than dispatch twice.
    /// Throwing fails the step retryably; throw
    /// <see cref="Altinn.App.Core.EFormidling.Implementation.EformidlingDeliveryException"/> instead
    /// when the shipment can never succeed — an id that cannot be reused, say — and the task fails
    /// permanently for manual follow-up.
    /// </remarks>
    /// <param name="dataAccessor">The active instance data accessor for the instance being shipped.</param>
    /// <param name="configuration">A valid config for eFormidling.</param>
    /// <param name="cancellationToken">
    /// Cancelled when the engine cuts the attempt off at its execution deadline. The eFormidling client
    /// takes no token of its own, so observe it between calls.
    /// </param>
    public Task SendEFormidlingShipment(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Read how far the instance's shipment has got, so a caller waiting for delivery can decide
    /// whether to conclude, keep waiting, or give up. Implement this to change what your app treats
    /// as delivered — the eFormidling service task polls it until it reports a terminal state.
    /// </summary>
    /// <remarks>
    /// Called on every re-check, so keep it a cheap read with no side effects. Do not throw for "no
    /// outcome yet" — report <see cref="EFormidlingDeliveryState.Pending"/>, or the wait becomes a
    /// retry loop.
    /// </remarks>
    /// <param name="dataAccessor">The active instance data accessor for the shipped instance.</param>
    /// <param name="configuration">A valid config for eFormidling.</param>
    /// <param name="cancellationToken">Cancelled when the workflow engine cuts the attempt off at its execution deadline.</param>
    public Task<EFormidlingShipmentStatus> GetEFormidlingShipmentStatus(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    );
}
