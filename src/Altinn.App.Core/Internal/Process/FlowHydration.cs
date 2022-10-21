using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Class used to get next elements in the process based on the Process and custom implementations of <see cref="IProcessExclusiveGateway" /> to make gateway decisions.
/// </summary>
public class FlowHydration: IFlowHydration
{
    private readonly IProcessReader _processReader;
    private readonly ExclusiveGatewayFactory _gatewayFactory;

    /// <summary>
    /// Initialize a new instance of FlowHydration
    /// </summary>
    /// <param name="processReader">IProcessReader implementation used to read the process</param>
    /// <param name="gatewayFactory">ExclusiveGatewayFactory used to fetch gateway code to be executed</param>
    public FlowHydration(IProcessReader processReader, ExclusiveGatewayFactory gatewayFactory)
    {
        _processReader = processReader;
        _gatewayFactory = gatewayFactory;
    }
    
    /// <inheritdoc />
    public async Task<List<ProcessElement>> NextFollowAndFilterGateways(Instance instance, string? currentElement, bool followDefaults = true)
    {
        List<ProcessElement> directFlowTargets = _processReader.GetNextElements(currentElement);
        return await NextFollowAndFilterGateways(instance, directFlowTargets!, followDefaults);
    }

    /// <inheritdoc />
    public async Task<List<ProcessElement>> NextFollowAndFilterGateways(Instance instance, List<ProcessElement?> originNextElements, bool followDefaults = true)
    {
        List<ProcessElement> filteredNext = new List<ProcessElement>();
        foreach (var directFlowTarget in originNextElements)
        {
            if (directFlowTarget == null)
            {
                continue;
            }
            if (!IsGateway(directFlowTarget))
            {
                filteredNext.Add(directFlowTarget);
                continue;
            }

            var gateway = (ExclusiveGateway)directFlowTarget;
            IProcessExclusiveGateway? gatewayFilter = _gatewayFactory.GetProcessExclusiveGateway(directFlowTarget.Id);
            List<SequenceFlow> outgoingFlows = _processReader.GetOutgoingSequenceFlows(directFlowTarget);
            List<SequenceFlow> filteredList;
            if (gatewayFilter == null)
            {
                filteredList = outgoingFlows;
            }
            else
            {
                filteredList = await gatewayFilter.FilterAsync(outgoingFlows, instance);
            }

            var defaultSequenceFlow = filteredList.Find(s => s.Id == gateway.Default);
            if (followDefaults && defaultSequenceFlow != null)
            {
                var defaultTarget = _processReader.GetFlowElement(defaultSequenceFlow.TargetRef);
                filteredNext.AddRange(await NextFollowAndFilterGateways(instance, new List<ProcessElement?> { defaultTarget }));
            }
            else
            {
                var filteredTargets= filteredList.Select(e => _processReader.GetFlowElement(e.TargetRef)).ToList();
                filteredNext.AddRange(await NextFollowAndFilterGateways(instance, filteredTargets));
            }
        }

        return filteredNext;
    }

    private static bool IsGateway(ProcessElement processElement)
    {
        return processElement is ExclusiveGateway;
    }
}
