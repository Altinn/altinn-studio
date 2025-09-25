using Altinn.App.Core.Features;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for retreiving the receivers of eFormidling shipments.
/// </summary>
[ImplementableByApps]
public interface IEFormidlingReceivers
{
    /// <summary>
    /// Gets a list of eFormidling shipment receivers
    /// </summary>
    /// <remarks>
    /// Note that the identifier value property on the receiver objects should be prefixed with `0192:` for Norwegian organisations.
    /// </remarks>
    /// <param name="instance">Instance data</param>
    /// <returns>List of eFormidling receivers</returns>
    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance);
}
