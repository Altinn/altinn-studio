using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetPartyListForPartyIds(IReadOnlyList<int> partyIds)
    {
        var activity = ActivitySource.StartActivity("RegisterClient.GetPartyListForPartyIds");
        if (activity is not null && partyIds is not null)
        {
            var now = DateTimeOffset.UtcNow;
            ActivityTagsCollection tags = new([new("party_ids.count", partyIds.Count)]);
            if (partyIds.Count <= 10)
            {
                for (int i = 0; i < partyIds.Count; i++)
                {
                    var partyId = partyIds[i];
                    tags.Add(new($"party_ids.{i}.value", partyId));
                }
            }

            activity.AddEvent(new ActivityEvent("data", now, tags));
        }
        return activity;
    }
}
