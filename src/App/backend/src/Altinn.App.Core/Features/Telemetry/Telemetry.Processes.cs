using System.Diagnostics;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.Processes;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitProcesses(InitContext context)
    {
        InitMetricCounter(context, MetricNameProcessesStarted, static m => m.Add(0));
        InitMetricCounter(context, MetricNameProcessesEnded, static m => m.Add(0));

        InitMetricHistogram(context, MetricNameProcessesDuration);
    }

    internal void ProcessStarted()
    {
        _counters[MetricNameProcessesStarted].Add(1);
    }

    internal void ProcessEnded(ProcessStateChange processChange)
    {
        if (processChange?.NewProcessState?.Started is null || processChange?.NewProcessState?.Ended is null)
        {
            return;
        }
        var state = processChange.NewProcessState;

        _counters[MetricNameProcessesEnded].Add(1);
        var duration = state.Ended.Value - state.Started.Value;
        _histograms[MetricNameProcessesDuration].Record(duration.TotalSeconds);
    }

    internal Activity? StartProcessStartActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.Start");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessNextActivity(Instance instance, string? action)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.Next");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessAction, action);
        return activity;
    }

    internal Activity? StartApiProcessNextActivity(InstanceIdentifier instanceIdentifier)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ApiNext");
        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        return activity;
    }

    internal Activity? StartApiProcessCompleteActivity(InstanceIdentifier instanceIdentifier)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ApiComplete");
        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        return activity;
    }

    internal Activity? StartProcessHandleEventsActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.HandleEvents");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessStoreEventsActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.StoreEvents");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessExecuteServiceTaskActivity(Instance instance, string serviceTaskType)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ExecuteServiceTask");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessServiceTaskType, serviceTaskType);
        return activity;
    }

    internal Activity? StartProcessEndActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.End");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessEndHandlersActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.EndHandlers");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessEndHandlerActivity(Instance instance, IProcessEnd handler)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.EndHandler.{handler.GetType()}");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal static class Processes
    {
        internal const string Prefix = "Process";

        internal static readonly string MetricNameProcessesStarted = Metrics.CreateLibName("processes_started");
        internal static readonly string MetricNameProcessesEnded = Metrics.CreateLibName("processes_ended");
        internal static readonly string MetricNameProcessesDuration = Metrics.CreateLibName("processes_duration");
    }
}
