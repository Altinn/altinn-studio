using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.DataClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartInsertFormDataActivity(Instance? instance)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.InsertFormData");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartInsertFormDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.InsertFormData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartUpdateDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartGetBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.GetBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartGetBinaryDataListActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.GetBinaryDataList");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartDeleteBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.DeleteBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartInsertBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.InsertBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartInsertBinaryDataActivity(string? instanceId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.InsertBinaryData");
        activity?.SetInstanceId(instanceId);
        return activity;
    }

    internal Activity? StartUpdateBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartUpdateBinaryDataActivity(string? instanceId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateBinaryData");
        activity?.SetInstanceId(instanceId);
        return activity;
    }

    internal Activity? StartUpdateDataActivity(Instance? instance)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UpdateData");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartDeleteDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.DeleteData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartGetFormDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.GetFormData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartLockDataElementActivity(string? instanceId, Guid? dataGuid)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.LockDataElement");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataGuid);
        return activity;
    }

    internal Activity? StartUnlockDataElementActivity(string? instanceId, Guid? dataGuid)
    {
        var activity = ActivitySource.StartActivity($"{_prefix}.UnlockDataElement");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataGuid);
        return activity;
    }

    internal static class DataClient
    {
        internal const string _prefix = "DataClient";
    }
}
