using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of <see cref="IProcessNavigator"/>
/// </summary>
public class ProcessNavigator : IProcessNavigator
{
    private readonly IProcessReader _processReader;
    private readonly ExclusiveGatewayFactory _gatewayFactory;
    private readonly ILogger<ProcessNavigator> _logger;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;

    /// <summary>
    /// Initialize a new instance of <see cref="ProcessNavigator"/>
    /// </summary>
    public ProcessNavigator(
        IProcessReader processReader,
        ExclusiveGatewayFactory gatewayFactory,
        ILogger<ProcessNavigator> logger,
        IServiceProvider serviceProvider
    )
    {
        _processReader = processReader;
        _gatewayFactory = gatewayFactory;
        _logger = logger;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
    }

    /// <inheritdoc/>
    public async Task<ProcessElement?> GetNextTask(Instance instance, string currentElement, string? action)
    {
        List<ProcessElement> directFlowTargets = _processReader.GetNextElements(currentElement);
        List<ProcessElement> filteredNext = await NextFollowAndFilterGateways(
            instance,
            directFlowTargets as List<ProcessElement?>,
            action
        );
        if (filteredNext.Count == 0)
        {
            return null;
        }

        if (filteredNext.Count == 1)
        {
            return filteredNext[0];
        }

        throw new ProcessException(
            $"Multiple next elements found from {currentElement}. Please supply action and filters or define a default flow."
        );
    }

    private async Task<List<ProcessElement>> NextFollowAndFilterGateways(
        Instance instance,
        List<ProcessElement?> originNextElements,
        string? action
    )
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
            List<SequenceFlow> outgoingFlows = _processReader.GetOutgoingSequenceFlows(directFlowTarget);
            IProcessExclusiveGateway? gatewayFilter;
            if (outgoingFlows.Any(a => a.ConditionExpression != null))
            {
                gatewayFilter = _gatewayFactory.GetProcessExclusiveGateway("AltinnExpressionsExclusiveGateway");
            }
            else
            {
                gatewayFilter = _gatewayFactory.GetProcessExclusiveGateway(directFlowTarget.Id);
            }
            List<SequenceFlow> filteredList;
            if (gatewayFilter == null)
            {
                filteredList = outgoingFlows;
            }
            else
            {
                ProcessGatewayInformation gatewayInformation = new()
                {
                    Action = action,
                    DataTypeId = gateway.ExtensionElements?.GatewayExtension?.ConnectedDataTypeId,
                };

                IInstanceDataAccessor dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
                    instance,
                    taskId: null,
                    language: null
                );

                filteredList = await gatewayFilter.FilterAsync(
                    outgoingFlows,
                    instance,
                    dataAccessor,
                    gatewayInformation
                );

                if (filteredList.Count != 1)
                {
                    throw new ProcessException(
                        $"Exclusive gateway {gatewayFilter.GatewayId} returned {filteredList.Count} flows. Expected 1"
                    );
                }
            }
            var defaultSequenceFlow = filteredList.Find(s => s.Id == gateway.Default);
            if (defaultSequenceFlow != null)
            {
                var defaultTarget = _processReader.GetFlowElement(defaultSequenceFlow.TargetRef);
                filteredNext.AddRange(
                    await NextFollowAndFilterGateways(instance, new List<ProcessElement?> { defaultTarget }, action)
                );
            }
            else
            {
                var filteredTargets = filteredList.Select(e => _processReader.GetFlowElement(e.TargetRef)).ToList();
                filteredNext.AddRange(await NextFollowAndFilterGateways(instance, filteredTargets, action));
            }
        }
        _logger.LogDebug(
            "Filtered next elements: {FilteredNextElements}",
            string.Join(", ", filteredNext.Select(e => e.Id))
        );
        return filteredNext;
    }

    private static bool IsGateway(ProcessElement processElement)
    {
        return processElement is ExclusiveGateway;
    }
}
