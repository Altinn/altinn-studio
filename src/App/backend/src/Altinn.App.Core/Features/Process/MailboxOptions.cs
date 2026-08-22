namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a service task opens via <see cref="ServiceTaskPipeline.WithReplyFrom"/>: a durable inbox
/// whose id the declaring stage publishes as its reply address. Minted when that stage runs, carrying the
/// exchange's one absolute deadline (<em>now + <see cref="Timeout"/></em>); nothing re-arms it.
/// </summary>
public sealed record MailboxOptions
{
    /// <summary>
    /// How long the mailbox accepts messages, from the mint. When it runs out the task is told so in place of
    /// a message, and concludes in its own words.
    /// </summary>
    /// <remarks>
    /// A real domain deadline only the task can know; days are ordinary. One ceiling cannot be checked at app
    /// startup: the engine's <c>MaxMailboxTimeout</c> (21 days by default) rejects the mint and fails the
    /// declaring transition. A long exchange also inherits the general constraint that callback token and state
    /// blob are signed with the app code current at enqueue and never refreshed — bounded by code rotation, not
    /// by anything measured here.
    /// </remarks>
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Called eagerly by <see cref="ServiceTaskPipeline.WithReplyFrom"/>, so a bad declaration is an app
    /// startup failure.
    /// </summary>
    internal void Validate() =>
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(Timeout, TimeSpan.Zero, nameof(Timeout));
}
