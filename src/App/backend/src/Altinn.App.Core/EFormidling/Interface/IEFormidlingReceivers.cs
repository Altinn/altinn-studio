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
    /// Gets a list of eFormidling shipment receivers.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Note that the identifier value property on the receiver objects should be prefixed with `0192:` for Norwegian organisations.
    /// </para>
    /// </remarks>
    /// <param name="instance">Instance data</param>
    /// <returns>List of eFormidling receivers</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="instance"/> is null</exception>
    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance);

    /// <summary>
    /// Gets a list of eFormidling shipment receivers.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Note that the identifier value property on the receiver objects should be prefixed with `0192:` for Norwegian organisations.
    /// </para>
    /// </remarks>
    /// <param name="instance">Instance data</param>
    /// <param name="receiverFromConfig">Receiver organization number from static configuration (BPMN or ApplicationMetadata, depending on if service task is used or not).</param>
    /// <returns>List of eFormidling receivers</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="instance"/> is null</exception>
    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance, string? receiverFromConfig) =>
        GetEFormidlingReceivers(instance);
}
