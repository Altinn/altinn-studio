using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.DataClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartInsertFormDataActivity(Instance? instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.InsertFormData");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartUpdateDataActivity(Guid instanceId, Guid dataElementId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateData");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataElementId);
        return activity;
    }

    internal Activity? StartUpdateDataActivity(Instance instance, DataElement dataElement)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateData");
        activity?.SetInstanceId(instance);
        activity?.SetDataElementId(dataElement);
        return activity;
    }

    internal Activity? StartGetBinaryDataActivity(Guid instanceId, Guid dataElementId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataElementId);
        return activity;
    }

    internal Activity? StartGetBinaryDataListActivity(Guid? instanceId, int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetBinaryDataList");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartInsertBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.InsertBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartInsertBinaryDataActivity(string? instanceId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.InsertBinaryData");
        activity?.SetInstanceId(instanceId);
        return activity;
    }

    internal Activity? StartUpdateBinaryDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateBinaryData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartUpdateBinaryDataActivity(string? instanceId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateBinaryData");
        activity?.SetInstanceId(instanceId);
        return activity;
    }

    internal Activity? StartUpdateDataActivity(Instance? instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UpdateData");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartDeleteDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.DeleteData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartGetFormDataActivity(Guid? instanceId, int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetFormData");
        activity?.SetInstanceId(instanceId);
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartGetFormDataActivity(Instance? instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GetFormData");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartLockDataElementActivity(string? instanceId, Guid? dataGuid)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.LockDataElement");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataGuid);
        return activity;
    }

    internal Activity? StartUnlockDataElementActivity(string? instanceId, Guid? dataGuid)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.UnlockDataElement");
        activity?.SetInstanceId(instanceId);
        activity?.SetDataElementId(dataGuid);
        return activity;
    }

    internal static class DataClient
    {
        internal const string Prefix = "DataClient";
    }
}
