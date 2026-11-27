using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.Instances;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitInstances(InitContext context)
    {
        InitMetricCounter(context, MetricNameInstancesCreated, "{instance}", "Instances the app created.");
        InitMetricCounter(context, MetricNameInstancesCompleted, "{instance}", "Instances the app completed.");
        InitMetricCounter(context, MetricNameInstancesDeleted, "{instance}", "Instances the app deleted.");
        InitMetricHistogram(
            context,
            MetricNameInstancesDuration,
            "Time from an instance's creation until the app completed or deleted it."
        );
    }

    internal void InstanceCreated(Instance instance) => _counters[MetricNameInstancesCreated].Add(1);

    internal void InstanceCompleted(Instance instance)
    {
        _counters[MetricNameInstancesCompleted].Add(1);

        if (instance.Created is not null)
        {
            var duration = DateTime.UtcNow - instance.Created.Value;
            _histograms[MetricNameInstancesDuration].Record(duration.TotalSeconds);
        }
    }

    internal void InstanceDeleted(Instance instance)
    {
        _counters[MetricNameInstancesDeleted].Add(1);

        if (instance.Created is not null)
        {
            var duration = DateTime.UtcNow - instance.Created.Value;
            _histograms[MetricNameInstancesDuration].Record(duration.TotalSeconds);
        }
    }

    internal Activity? StartGetInstanceByGuidActivity(Guid? instanceGuid = null)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetInstanceByGuid");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartGetInstanceByInstanceActivity(Guid? instanceGuid = null)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetInstanceByInstance");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartGetInstancesActivity(Guid? instanceGuid = null)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetInstances");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartQueryInstancesActivity() => LibraryActivitySource.StartActivity($"{Prefix}.Query");

    internal Activity? StartCreateInstanceActivity()
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Create");
        return activity;
    }

    internal Activity? StartDeleteInstanceActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Delete");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateProcessActivity(Instance instance, int eventCount = 0)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateProcess");
        activity?.SetInstanceId(instance);
        activity?.SetTag(Labels.InstanceEventsCount, eventCount);
        return activity;
    }

    internal Activity? StartCompleteConfirmationActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.CompleteConfirmation");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateReadStatusActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateReadStatus");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateSubStatusActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateSubStatus");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdatePresentationTextActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdatePresentationText");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateDataValuesActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateDataValues");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal static class Instances
    {
        internal const string Prefix = "Instance";

        internal static readonly string MetricNameInstancesCreated = Metrics.CreateLibName("instances.created");
        internal static readonly string MetricNameInstancesCompleted = Metrics.CreateLibName("instances.completed");
        internal static readonly string MetricNameInstancesDeleted = Metrics.CreateLibName("instances.deleted");
        internal static readonly string MetricNameInstancesDuration = Metrics.CreateLibName("instances.duration");
    }
}
