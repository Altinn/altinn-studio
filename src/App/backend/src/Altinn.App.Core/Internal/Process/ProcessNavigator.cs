using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models.Process;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of <see cref="IProcessNavigator"/>
/// </summary>
internal sealed class ProcessNavigator : IProcessNavigator
{
    private readonly IProcessReader _processReader;
    private readonly ExclusiveGatewayFactory _gatewayFactory;
    private readonly ILogger<ProcessNavigator> _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initialize a new instance of <see cref="ProcessNavigator"/>
    /// </summary>
    public ProcessNavigator(
        IProcessReader processReader,
        ExclusiveGatewayFactory gatewayFactory,
        ILogger<ProcessNavigator> logger,
        Telemetry? telemetry = null
    )
    {
        _processReader = processReader;
        _gatewayFactory = gatewayFactory;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<ProcessElement?> GetNextTask(
        IInstanceDataAccessor dataAccessor,
        string currentElement,
        string? action
    )
    {
        using var activity = _telemetry?.StartProcessNavigatorGetNextTaskActivity(
            dataAccessor.Instance,
            currentElement,
            action
        );

        List<ProcessElement> directFlowTargets = _processReader.GetNextElements(currentElement);
        List<ProcessElement> filteredNext = await NextFollowAndFilterGateways(
            dataAccessor,
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
        IInstanceDataAccessor dataAccessor,
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
            // As in BPMN, the default flow is a fallback: the gateway takes it only when no other flow is valid.
            SequenceFlow? defaultFlow = outgoingFlows.Find(flow => flow.Id == gateway.Default);
            List<SequenceFlow> otherFlows = outgoingFlows.FindAll(flow => flow != defaultFlow);
            IProcessExclusiveGateway? gatewayFilter;
            List<SequenceFlow> flowsToFilter;
            if (outgoingFlows.Any(a => a.ConditionExpression != null))
            {
                gatewayFilter = _gatewayFactory.GetProcessExclusiveGateway("AltinnExpressionsExclusiveGateway");
                // The default's own condition is never evaluated.
                flowsToFilter = otherFlows;
            }
            else
            {
                gatewayFilter = _gatewayFactory.GetProcessExclusiveGateway(directFlowTarget.Id);
                // An app's own gateway code gets every flow, as IProcessExclusiveGateway documents.
                flowsToFilter = outgoingFlows;
            }
            List<SequenceFlow> validFlows;
            if (gatewayFilter == null)
            {
                // A flow without a condition is always valid.
                validFlows = otherFlows;
            }
            else
            {
                ProcessGatewayInformation gatewayInformation = new()
                {
                    Action = action,
                    DataTypeId = gateway.ExtensionElements?.GatewayExtension?.ConnectedDataTypeId,
                };

                validFlows = await gatewayFilter.FilterAsync(
                    flowsToFilter,
                    dataAccessor.Instance,
                    dataAccessor,
                    gatewayInformation
                );

                if (validFlows.Count > 1)
                {
                    throw new ProcessException(
                        $"Exclusive gateway {gateway.Id} has {validFlows.Count} valid outgoing flows "
                            + $"({string.Join(", ", validFlows.Select(flow => flow.Id))}). Expected 1"
                    );
                }
                if (validFlows.Count == 0 && defaultFlow is null)
                {
                    throw new ProcessException(
                        $"Exclusive gateway {gateway.Id} has no valid outgoing flow and no default flow"
                    );
                }
            }
            List<SequenceFlow> takenFlows =
                validFlows.Count == 0 && defaultFlow is not null ? [defaultFlow] : validFlows;
            var takenTargets = takenFlows.Select(e => _processReader.GetFlowElement(e.TargetRef)).ToList();
            filteredNext.AddRange(await NextFollowAndFilterGateways(dataAccessor, takenTargets, action));
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
