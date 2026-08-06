using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for sending eFormidling shipments and following them to
/// delivery. Default implementation is <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingService"/>.
/// </summary>
public interface IEFormidlingService
{
    /// <summary>
    /// Send the eFormidling shipment with explicit configuration context.
    /// </summary>
    /// <param name="dataAccessor">The active instance data accessor for the instance being shipped.</param>
    /// <param name="configuration">A valid config for eFormidling.</param>
    /// <returns></returns>
    public Task SendEFormidlingShipment(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration
    );

    /// <summary>
    /// Read how far the instance's shipment has got, so a caller waiting for delivery can decide
    /// whether to conclude, keep waiting, or give up. Implement this to change what your app treats
    /// as delivered — the eFormidling service task polls it until it reports a terminal state.
    /// </summary>
    /// <remarks>
    /// Called repeatedly while the service task waits, so it must be a cheap read with no side
    /// effects. It also must not throw for "no outcome yet": report
    /// <see cref="EFormidlingDeliveryState.Pending"/> instead, or the wait becomes a retry loop.
    /// </remarks>
    /// <param name="dataAccessor">The active instance data accessor for the shipped instance.</param>
    /// <param name="configuration">A valid config for eFormidling.</param>
    public Task<EFormidlingShipmentStatus> GetEFormidlingShipmentStatus(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration
    );
}
