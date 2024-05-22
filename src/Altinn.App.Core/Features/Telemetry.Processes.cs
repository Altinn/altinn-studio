using System.Diagnostics;
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
        var activity = ActivitySource.StartActivity($"{_prefix}.Start");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessNextActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.Next");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessEndActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.End");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal static class Processes
    {
        internal const string _prefix = "Process";

        internal static readonly string MetricNameProcessesStarted = Metrics.CreateLibName("processes_started");
        internal static readonly string MetricNameProcessesEnded = Metrics.CreateLibName("processes_ended");
        internal static readonly string MetricNameProcessesDuration = Metrics.CreateLibName("processes_duration");
    }
}
