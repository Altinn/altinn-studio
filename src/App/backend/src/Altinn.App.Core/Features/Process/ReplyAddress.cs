namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Where the replies to an external stage's message go, handed to its send. The send publishes <see cref="Id"/>
/// in a field the external system echoes back, and <see cref="IServiceTaskReplyForwarder"/> delivers what comes back
/// to it. A retried or deferred send is handed the same address.
/// </summary>
public sealed record ReplyAddress
{
    /// <summary>
    /// The reply address. Unguessable, but <strong>not a secret</strong>: it says where a reply goes, not who sent
    /// it. Checking what comes back is the receiving side's job, as for any other callback address.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// When the address stops accepting replies: the time it was opened, right before the send's first attempt,
    /// plus the stage's timeout. No reply moves it.
    /// </summary>
    public required DateTimeOffset Deadline { get; init; }
}
