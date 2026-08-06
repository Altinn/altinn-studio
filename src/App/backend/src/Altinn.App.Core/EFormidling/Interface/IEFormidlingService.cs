using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for sending eFormidling shipments. Default implementation is <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingService"/>.
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
}
