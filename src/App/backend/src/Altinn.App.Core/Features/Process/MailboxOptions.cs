namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a service task's stage opens: a durable inbox whose id that stage publishes as its reply
/// address. Minted by the step immediately before that stage, carrying the exchange's one absolute deadline
/// (<em>mint time + <see cref="Timeout"/></em>); nothing re-arms it.
/// </summary>
public sealed record MailboxOptions
{
    /// <summary>
    /// How long the mailbox accepts messages. When it runs out the task is told so in place of a message, and
    /// concludes in its own words. Bounded by the engine's <c>MaxMailboxTimeout</c> (21 days by default),
    /// which app startup cannot check — a timeout past it rejects the mint.
    /// </summary>
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Called eagerly by the mailbox-opening <c>Stage</c> overload, so a bad declaration is an app startup
    /// failure.
    /// </summary>
    internal void Validate() =>
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(Timeout, TimeSpan.Zero, nameof(Timeout));
}
