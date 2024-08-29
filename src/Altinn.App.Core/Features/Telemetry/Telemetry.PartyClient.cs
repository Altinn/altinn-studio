using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetPartyActivity(int? partyId)
    {
        var activity = ActivitySource.StartActivity("PartyClient.GetParty");
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartLookupPartyActivity() => ActivitySource.StartActivity("PartyClient.LookupParty");
}
