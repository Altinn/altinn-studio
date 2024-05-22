using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.Instances;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitInstances(InitContext context)
    {
        InitMetricCounter(context, MetricNameInstancesCreated, init: static m => m.Add(0));
        InitMetricCounter(context, MetricNameInstancesCompleted, init: static m => m.Add(0));
        InitMetricCounter(context, MetricNameInstancesDeleted, init: static m => m.Add(0));

        InitMetricHistogram(context, MetricNameInstancesDuration);
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
        var activity = ActivitySource.StartActivity($"{_prefix}.GetInstanceByGuid");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartGetInstanceByInstanceActivity(Guid? instanceGuid = null)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.GetInstanceByInstance");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartGetInstancesActivity(Guid? instanceGuid = null)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.GetInstances");
        activity?.SetInstanceId(instanceGuid);
        return activity;
    }

    internal Activity? StartQueryInstancesActivity() => ActivitySource.StartActivity($"{_prefix}.Query");

    internal Activity? StartCreateInstanceActivity()
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.Create");
        return activity;
    }

    internal Activity? StartDeleteInstanceActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.Delete");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateProcessActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateProcess");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartCompleteConfirmationActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.CompleteConfirmation");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateReadStatusActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateReadStatus");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateSubStatusActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateSubStatus");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdatePresentationTextActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdatePresentationText");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal Activity? StartUpdateDataValuesActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateDataValues");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }

    internal static class Instances
    {
        internal const string _prefix = "Instance";

        internal static readonly string MetricNameInstancesCreated = Metrics.CreateLibName("instances_created");
        internal static readonly string MetricNameInstancesCompleted = Metrics.CreateLibName("instances_completed");
        internal static readonly string MetricNameInstancesDeleted = Metrics.CreateLibName("instances_deleted");
        internal static readonly string MetricNameInstancesDuration = Metrics.CreateLibName("instances_duration");
    }
}
