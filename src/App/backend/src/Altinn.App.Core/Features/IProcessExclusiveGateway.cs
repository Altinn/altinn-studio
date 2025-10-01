using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for defining custom decision logic for exclusive gateways
/// </summary>
[ImplementableByApps]
public interface IProcessExclusiveGateway
{
    /// <summary>
    /// Id of the gateway in the BPMN process this filter applies to
    /// </summary>
    string GatewayId { get; }

    /// <summary>
    /// Filter out non viable flows from a gateway with id as defined in <see cref="GatewayId"/>
    /// </summary>
    /// <param name="outgoingFlows">Complete list of defined flows out of gateway</param>
    /// <param name="instance">Instance where process is about to move next</param>
    /// <param name="dataAccessor">Cached accessor for instance.Data</param>
    /// <param name="processGatewayInformation">Information connected with the current gateway under evaluation</param>
    /// <returns>List of possible SequenceFlows to choose out of the gateway</returns>
    public async Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        // TODO: Remmove default implemntation that calls the legacy in v9
#pragma warning disable CS0618 // Type or member is obsolete
        return await FilterAsync(outgoingFlows, instance, processGatewayInformation);
#pragma warning restore CS0618 // Type or member is obsolete
    }

    /// <summary>
    /// Legacy method for filtering out non viable flows from a gateway with id as defined in <see cref="GatewayId"/>. Will add support for <see cref="IInstanceDataAccessor"/> in v9
    /// </summary>
    /// <param name="outgoingFlows">Complete list of defined flows out of gateway</param>
    /// <param name="instance">Instance where process is about to move next</param>
    /// <param name="processGatewayInformation">Information connected with the current gateway under evaluation</param>
    /// <returns>List of possible SequenceFlows to choose out of the gateway</returns>
    [Obsolete(
        "Use FilterAsync(List<SequenceFlow>, Instance, IInstanceDataAccessor, ProcessGatewayInformation) instead"
    )]
    public Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        ProcessGatewayInformation processGatewayInformation
    );
}
