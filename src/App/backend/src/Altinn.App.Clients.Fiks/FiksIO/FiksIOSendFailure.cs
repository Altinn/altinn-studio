using KS.Fiks.IO.Send.Client.Exceptions;

namespace Altinn.App.Clients.Fiks.FiksIO;

/// <summary>
/// Classifies a failed Fiks IO send along two axes. First, deterministic or not: only a failure that
/// provably fails identically on every retry may be classified here at all — everything else, Maskinporten
/// and transport failures included, retries, since either can heal (an outage passes; even a genuine
/// Maskinporten refusal heals under key rollover or clock skew). Second, who remediates a deterministic
/// failure: a <em>case-level</em> one (<see cref="IsRecipientNotFound"/> — the recipient comes from the
/// instance's own data) concludes the exchange down <c>errorHandling</c>, while an <em>app-level</em> one
/// (<see cref="IsCredentialsRefused"/> — an operations problem no citizen action helps) fails the workflow
/// as a plain permanent stage failure, leaving the mailbox open so a resume after the fix re-runs the send
/// and the exchange completes normally. Misclassifying either way is harmful: a false "deterministic"
/// concludes or fails over a passing outage, and concluding an app-level failure closes the mailbox the
/// resumed send's answers would need.
/// </summary>
internal static class FiksIOSendFailure
{
    /// <summary>
    /// Fiks IO refused the app's integration credentials. App-level: fixed by the app owner, then the
    /// workflow is resumed.
    /// </summary>
    public static bool IsCredentialsRefused(Exception exception) => exception is FiksIOSendUnauthorizedException;

    /// <summary>
    /// The recipient account does not exist (an unexpected response naming status code NotFound).
    /// Case-level: the address came from the instance's own data, so the exchange concludes.
    /// </summary>
    public static bool IsRecipientNotFound(Exception exception) =>
        exception is FiksIOSendUnexpectedResponseException unexpectedResponse
        && unexpectedResponse.Message.Contains("status code notfound", StringComparison.OrdinalIgnoreCase);
}
