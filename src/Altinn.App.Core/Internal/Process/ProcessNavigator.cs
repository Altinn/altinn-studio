using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of <see cref="IProcessNavigator"/>
/// </summary>
public class ProcessNavigator : IProcessNavigator
{
    private readonly IProcessReader _processReader;
    private readonly ExclusiveGatewayFactory _gatewayFactory;

    /// <summary>
    /// Initialize a new instance of <see cref="ProcessNavigator"/>
    /// </summary>
    /// <param name="processReader">The process reader</param>
    /// <param name="gatewayFactory">Service to fetch wanted gateway filter implementation</param>
    public ProcessNavigator(IProcessReader processReader, ExclusiveGatewayFactory gatewayFactory)
    {
        _processReader = processReader;
        _gatewayFactory = gatewayFactory;
    }


    /// <inheritdoc/>
    public async Task<ProcessElement?> GetNextTask(Instance instance, string currentElement, string? action)
    {
        List<ProcessElement> directFlowTargets = _processReader.GetNextElements(currentElement);
        List<ProcessElement> filteredNext = await NextFollowAndFilterGateways(instance, directFlowTargets, action);
        if (filteredNext.Count == 0)
        {
            return null;
        }

        if (filteredNext.Count == 1)
        {
            return filteredNext[0];
        }

        throw new ProcessException($"Multiple next elements found from {currentElement}. Please supply action and filters or define a default flow.");
    }

    private async Task<List<ProcessElement>> NextFollowAndFilterGateways(Instance instance, List<ProcessElement?> originNextElements, string? action)
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
                filteredList = await gatewayFilter.FilterAsync(outgoingFlows, instance, action);
            }

            var defaultSequenceFlow = filteredList.Find(s => s.Id == gateway.Default);
            if (defaultSequenceFlow != null)
            {
                var defaultTarget = _processReader.GetFlowElement(defaultSequenceFlow.TargetRef);
                filteredNext.AddRange(await NextFollowAndFilterGateways(instance, new List<ProcessElement?> { defaultTarget }, action));
            }
            else
            {
                var filteredTargets = filteredList.Select(e => _processReader.GetFlowElement(e.TargetRef)).ToList();
                filteredNext.AddRange(await NextFollowAndFilterGateways(instance, filteredTargets, action));
            }
        }

        return filteredNext;
    }


    private static bool IsGateway(ProcessElement processElement)
    {
        return processElement is ExclusiveGateway;
    }
}
