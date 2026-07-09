using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for sending eFormidling shipments. Default implementation is <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingService"/>.
/// </summary>
public interface IEFormidlingService
{
    /// <summary>
    /// Send the eFormidling shipment with explicit configuration context.
    /// </summary>
    /// <param name="instance">Instance data</param>
    /// <param name="configuration">A valid config for eFormidling.</param>
    /// <param name="dataAccessor">The active instance data accessor, when the shipment is sent from a unit of work.</param>
    /// <returns></returns>
    public Task SendEFormidlingShipment(
        Instance instance,
        ValidAltinnEFormidlingConfiguration configuration,
        IInstanceDataAccessor? dataAccessor = null
    );
}
