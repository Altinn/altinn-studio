using Altinn.App.Core.EFormidling.Models;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Reads the integrasjonspunkt's status list for a shipment. The eFormidling status vocabulary, and
/// the judgment of what counts as delivered or terminally failed, lives here alone — the send
/// path's duplicate recovery and the delivery wait ask the same questions, and used to answer them
/// with two separate sets of predicates that could drift apart.
/// </summary>
internal static class EFormidlingStatusReader
{
    // The integrasjonspunkt's status values, compared case-insensitively: the values seen in
    // production are lower case, but the API promises nothing.
    private const string Sent = "sendt";
    private const string ReceivedByRecipient = "mottatt";
    private const string Delivered = "levert";
    private const string Read = "lest";
    private const string Failed = "feil";
    private const string LifetimeExpired = "levetid_utlopt";

    /// <summary>
    /// True when the message has left the integrasjonspunkt's outbox — any status beyond creation.
    /// Lets the send path tell a duplicate that is already on its way from one that was created but
    /// never sent, and so needs its upload/send steps finishing.
    /// </summary>
    internal static bool HasLeftOutbox(Statuses statuses) =>
        Find(statuses, Sent, ReceivedByRecipient, Delivered, Read) is not null;

    /// <summary>
    /// Classifies the status list into the outcome a caller acts on. Delivery wins over failure: a
    /// shipment that recorded an error and was delivered anyway has been delivered.
    /// </summary>
    internal static EFormidlingShipmentStatus Classify(Statuses statuses)
    {
        if (Find(statuses, Delivered, Read) is { } delivered)
        {
            return Describe(EFormidlingDeliveryState.Delivered, delivered);
        }

        if (Find(statuses, Failed, LifetimeExpired) is { } failed)
        {
            return Describe(EFormidlingDeliveryState.Failed, failed);
        }

        // No terminal outcome. The last entry rides along as a progress note — informational only,
        // which is why it is safe not to know whether the list is ordered.
        return Describe(EFormidlingDeliveryState.Pending, LastOrDefault(statuses));
    }

    private static EFormidlingShipmentStatus Describe(EFormidlingDeliveryState state, Statuses.Entry? entry) =>
        new()
        {
            State = state,
            Status = entry?.Status,
            Description = entry?.Description,
        };

    /// <summary>
    /// The first entry matching any of the wanted status values. A status value can be null — the
    /// integrasjonspunkt may omit the field — and
    /// <see cref="string.Equals(string?, string?, StringComparison)"/> handles that.
    /// </summary>
    private static Statuses.Entry? Find(Statuses statuses, params ReadOnlySpan<string> wanted)
    {
        List<Statuses.Entry>? content = statuses.Content;
        if (content is null)
        {
            return null;
        }

        foreach (Statuses.Entry entry in content)
        {
            foreach (string candidate in wanted)
            {
                if (string.Equals(entry.Status, candidate, StringComparison.OrdinalIgnoreCase))
                {
                    return entry;
                }
            }
        }

        return null;
    }

    private static Statuses.Entry? LastOrDefault(Statuses statuses)
    {
        List<Statuses.Entry>? content = statuses.Content;
        return content is { Count: > 0 } ? content[^1] : null;
    }
}
