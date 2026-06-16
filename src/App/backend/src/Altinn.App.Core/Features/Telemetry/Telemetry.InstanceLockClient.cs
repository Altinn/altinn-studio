using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAcquireInstanceLockActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity("AcquireInstanceLock");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);

        return activity;
    }

    internal Activity? StartReleaseInstanceLockActivity(Guid instanceGuid, int instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity("ReleaseInstanceLock");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);

        return activity;
    }

    internal Activity? StartUpdateInstanceLockActivity(Guid instanceGuid, int instanceOwnerPartyId, TimeSpan ttl)
    {
        var activity = ActivitySource.StartActivity("UpdateInstanceLock");
        activity?.SetInstanceId(instanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        activity?.SetTag("lock.ttl_seconds", (int)ttl.TotalSeconds);

        return activity;
    }
}
