using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Prometheus;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Decorator for the process engine that adds metrics for the number of processes started, ended and moved to next.
/// </summary>
public class ProcessEngineMetricsDecorator : IProcessEngine
{
    private readonly IProcessEngine _processEngine;
    private static readonly Counter ProcessTaskStartCounter = Metrics.CreateCounter("altinn_app_process_start_count", "Number of tasks started", labelNames: "result" );
    private static readonly Counter ProcessTaskNextCounter = Metrics.CreateCounter("altinn_app_process_task_next_count", "Number of tasks moved to next", "result", "action", "task");
    private static readonly Counter ProcessTaskEndCounter = Metrics.CreateCounter("altinn_app_process_end_count", "Number of tasks ended", labelNames: "result");
    private static readonly Counter ProcessTimeCounter = Metrics.CreateCounter("altinn_app_process_end_time_total", "Number of seconds used to complete instances", labelNames: "result");

    /// <summary>
    /// Create a new instance of the <see cref="ProcessEngineMetricsDecorator"/> class.
    /// </summary>
    /// <param name="processEngine">The process engine to decorate.</param>
    public ProcessEngineMetricsDecorator(IProcessEngine processEngine)
    {
        _processEngine = processEngine;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> StartProcess(ProcessStartRequest processStartRequest)
    {
        var result = await _processEngine.StartProcess(processStartRequest);
        ProcessTaskStartCounter.WithLabels(result.Success ? "success" : "failure").Inc();
        return result;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> Next(ProcessNextRequest request)
    {
        var result = await _processEngine.Next(request);
        ProcessTaskNextCounter.WithLabels(result.Success ? "success" : "failure", request.Action?? "", request.Instance.Process?.CurrentTask?.ElementId ?? "").Inc();
        if(result.ProcessStateChange?.NewProcessState?.Ended != null)
        {
            ProcessTaskEndCounter.WithLabels(result.Success ? "success" : "failure").Inc();
            if (result.ProcessStateChange?.NewProcessState?.Started != null)
            {
                ProcessTimeCounter.WithLabels(result.Success ? "success" : "failure").Inc(result.ProcessStateChange.NewProcessState.Ended.Value.Subtract(result.ProcessStateChange.NewProcessState.Started.Value).TotalSeconds);
            }
        }
        return result;
    }

    /// <inheritdoc/>
    public async Task<Instance> UpdateInstanceAndRerunEvents(ProcessStartRequest startRequest, List<InstanceEvent>? events)
    {
        return await _processEngine.UpdateInstanceAndRerunEvents(startRequest, events);
    }
}