using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for sending eFormidling shipments. Default implementation is <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingService"/>.
/// </summary>
public interface IEFormidlingService
{
    /// <summary>
    /// Send the eFormidling shipment
    /// </summary>
    /// <param name="instance">Instance data</param>
    /// <returns></returns>
    public Task SendEFormidlingShipment(Instance instance);
}
