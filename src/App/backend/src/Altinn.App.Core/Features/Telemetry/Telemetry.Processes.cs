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
        InitMetricCounter(context, MetricNameProcessesStarted, "{process}", "Processes the app started.");
        InitMetricCounter(context, MetricNameProcessesEnded, "{process}", "Processes that ended.");
        InitMetricHistogram(context, MetricNameProcessesDuration, "Time from a process's start until it ended.");
    }

    internal void ProcessStarted()
    {
        _counters[MetricNameProcessesStarted].Add(1);
    }

    internal void ProcessEnded(ProcessStateChange processChange)
    {
        if (processChange?.NewProcessState is not { Ended: { } ended } state)
        {
            return;
        }

        _counters[MetricNameProcessesEnded].Add(1);
        if (state.Started is { } started)
        {
            _histograms[MetricNameProcessesDuration].Record((ended - started).TotalSeconds);
        }
    }

    internal Activity? StartProcessStartActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Start");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessNextActivity(Instance instance, string? action)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Next");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessAction, action);
        return activity;
    }

    internal Activity? StartApiProcessNextActivity(InstanceIdentifier instanceIdentifier)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.ApiNext");
        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        return activity;
    }

    internal Activity? StartProcessHandleEventsActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.HandleEvents");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessStoreEventsActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.StoreEvents");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessExecuteServiceTaskActivity(Instance instance, string serviceTaskType)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.ExecuteServiceTask");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessServiceTaskType, serviceTaskType);
        return activity;
    }

    internal Activity? StartProcessEndActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.End");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessCallbackActivity(Guid instanceGuid, string commandKey)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Callback");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetTag(InternalLabels.ProcessCallbackCommand, commandKey);
        return activity;
    }

    internal Activity? StartProcessHandleUserActionActivity(Instance instance, string? action)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.HandleUserAction");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessAction, action);
        return activity;
    }

    internal Activity? StartProcessMoveToNextActivity(Instance instance, string? action)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.MoveToNext");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessAction, action);
        return activity;
    }

    internal Activity? StartProcessGenerateChangeEventActivity(Instance instance, string eventType)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GenerateChangeEvent");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessEventType, eventType);
        return activity;
    }

    internal Activity? StartProcessLoadAuthDetailsActivity(string authType)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.LoadAuthDetails");
        activity?.SetTag(Labels.UserAuthenticationType, authType);
        return activity;
    }

    internal Activity? StartProcessRegisterEventActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.RegisterEvent");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartProcessNavigatorGetNextTaskActivity(
        Instance instance,
        string currentElement,
        string? action
    )
    {
        var activity = LibraryActivitySource.StartActivity("ProcessNavigator.GetNextTask");
        activity?.SetInstanceId(instance);
        activity?.SetTag(InternalLabels.ProcessCurrentElement, currentElement);
        activity?.SetTag(InternalLabels.ProcessAction, action);
        return activity;
    }

    internal static class Processes
    {
        internal const string Prefix = "Process";

        internal static readonly string MetricNameProcessesStarted = Metrics.CreateLibName("processes.started");
        internal static readonly string MetricNameProcessesEnded = Metrics.CreateLibName("processes.ended");
        internal static readonly string MetricNameProcessesDuration = Metrics.CreateLibName("processes.duration");
    }
}
