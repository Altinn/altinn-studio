namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The pipeline that answers a mailbox: the service task or side effect whose stage opened it. A message is
/// forwarded to a mailbox <em>for</em> its owner, and the owner is bound into the forwarded message, so no other
/// pipeline can read it.
/// </summary>
/// <remarks>
/// A stage that opens a mailbox is handed its owner on <see cref="ServiceTaskMailbox.Owner"/>. A forwarder that
/// serves more than one pipeline can publish it with the reply address, as <see cref="ToString"/>, and read it
/// back with <see cref="Parse"/>.
/// </remarks>
public sealed record MailboxOwner
{
    private const string SideEffectPrefix = "sideEffect:";

    private MailboxOwner(string key)
    {
        Key = key;
    }

    /// <summary>
    /// The owner's identity as it is bound into a forwarded message: a service task's type, or a side effect's
    /// name behind a prefix.
    /// </summary>
    internal string Key { get; }

    /// <summary>A mailbox a service task's stage opened.</summary>
    /// <param name="serviceTaskType">The service task's <c>Type</c>.</param>
    public static MailboxOwner ServiceTask(string serviceTaskType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(serviceTaskType);
        return new MailboxOwner(serviceTaskType);
    }

    /// <summary>A mailbox a side effect's stage opened.</summary>
    /// <param name="sideEffectName">The side effect's <see cref="ISideEffect.Name"/>.</param>
    public static MailboxOwner SideEffect(string sideEffectName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sideEffectName);
        return new MailboxOwner(SideEffectPrefix + sideEffectName);
    }

    /// <summary>Reads an owner written with <see cref="ToString"/>.</summary>
    public static MailboxOwner Parse(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        return value.StartsWith(SideEffectPrefix, StringComparison.Ordinal)
            ? SideEffect(value[SideEffectPrefix.Length..])
            : ServiceTask(value);
    }

    /// <summary>The owner as text, for publishing with a reply address. <see cref="Parse"/> reads it back.</summary>
    public override string ToString() => Key;
}
