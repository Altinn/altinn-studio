using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.PrefillService;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartPrefillDataModelActivity() => ActivitySource.StartActivity($"{Prefix}.PrefillDataModel");

    internal Activity? StartPrefillDataModelActivity(string? partyId)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.PrefillDataModelWithId");
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal static class PrefillService
    {
        internal const string Prefix = "PrefillService";
    }
}
