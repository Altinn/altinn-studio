using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetPartyActivity(int? partyId)
    {
        var activity = LibraryActivitySource.StartActivity("PartyClient.GetParty");
        activity?.SetInstanceOwnerPartyId(partyId);
        return activity;
    }

    internal Activity? StartLookupPartyActivity() => LibraryActivitySource.StartActivity("PartyClient.LookupParty");
}
