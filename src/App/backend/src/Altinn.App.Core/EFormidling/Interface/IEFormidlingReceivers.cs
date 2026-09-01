using Altinn.App.Core.Features;
using Altinn.Common.EFormidlingClient.Models.SBD;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing custom logic for retrieving the receivers of eFormidling shipments.
/// </summary>
[ImplementableByApps]
public interface IEFormidlingReceivers
{
    /// <summary>
    /// Gets a list of eFormidling shipment receivers.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Note that the identifier value property on the receiver objects should be prefixed with `0192:` for Norwegian organizations.
    /// </para>
    /// </remarks>
    /// <param name="dataAccessor">The active instance data accessor for the instance being shipped.</param>
    /// <param name="receiverFromConfig">Receiver organization number from the eFormidling service task configuration (BPMN).</param>
    /// <returns>List of eFormidling receivers</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="dataAccessor"/> is null</exception>
    public Task<List<Receiver>> GetEFormidlingReceivers(IInstanceDataAccessor dataAccessor, string? receiverFromConfig);
}
