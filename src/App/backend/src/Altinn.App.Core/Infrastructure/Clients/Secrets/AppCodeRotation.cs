namespace Altinn.App.Core.Infrastructure.Clients.Secrets;

/// <summary>
/// <para>Which of an app's rotating codes to sign with. The operator rotates every code type the same way: it puts
/// a new code in the app-codes secret and keeps the older ones until they expire. Every pod accepts every code it
/// knows, so validation needs nothing from here.</para>
/// <para>Signing does. The pods of an app read the rotated secret at different times, and the app's Kubernetes
/// Service hands a callback to any of them. A pod that signed with a code as soon as it read it would have its
/// callbacks rejected by the pods that have not read it yet. So a pod waits <see cref="SigningGracePeriod"/> after
/// a code was issued before it signs with it, and by then every pod has known the code for a long time.</para>
/// </summary>
internal static class AppCodeRotation
{
    /// <summary>
    /// <para>How long after a code was issued a pod starts signing with it. It must exceed the time between the
    /// operator writing a new code and the last running pod reading it. That is the kubelet's refresh of the
    /// mounted secret (up to its sync period, a minute by default, plus the delay of its secret cache), the
    /// polling of the mounted file (the file provider's default of four seconds, see <c>ProvisionedSecrets</c>),
    /// and the clock skew between the operator, which stamps <see cref="AppCode.IssuedAt"/>, and the pod, which
    /// compares it with its own clock. That adds up to a few minutes. An hour also covers a kubelet that falls
    /// behind for a while.</para>
    /// <para>The grace period makes the codes a pod signs with up to an hour older, so a token bound to its code's
    /// expiry is valid an hour less. The workflow engine's <c>CallbackTokenLifetimeInvariantTests</c> count this
    /// hour.</para>
    /// <para>A constant and not a setting: the operator owns rotation, and an app that shortened this would
    /// bring the failure back.</para>
    /// </summary>
    internal static readonly TimeSpan SigningGracePeriod = TimeSpan.FromHours(1);

    /// <summary>
    /// <para>The code to sign with at <paramref name="now"/>: the newest unexpired code issued at least
    /// <see cref="SigningGracePeriod"/> ago. When no unexpired code is that old, as for an app's first codes, it is
    /// the newest unexpired code. Every running pod has read an app's first codes: the operator writes the first
    /// code of every type at once, and a pod does not start without a <c>WorkflowEngineCallback</c> code. Null
    /// when every code has expired.</para>
    /// <para>Newest means the latest <see cref="AppCode.IssuedAt"/>, not the first in the list, and the first in
    /// the list wins a tie. A code without <see cref="AppCode.IssuedAt"/> counts as issued long ago, so it signs as
    /// soon as it is read, as every code did before the grace period. The operator and studioctl both write
    /// <see cref="AppCode.IssuedAt"/>, so only a hand-written code lacks it, and nothing rotates that one.</para>
    /// </summary>
    /// <param name="codes">The codes of one type, as the app-codes secret lists them.</param>
    /// <param name="now">The current time.</param>
    internal static AppCode? SelectSigningCode(IReadOnlyList<AppCode> codes, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(codes);

        DateTimeOffset issuedBy = now - SigningGracePeriod;
        AppCode? newest = null;
        AppCode? newestPastGrace = null;
        foreach (AppCode code in codes)
        {
            if (code.ExpiresAt <= now)
                continue;

            if (newest is null || code.IssuedAt > newest.IssuedAt)
                newest = code;

            if (code.IssuedAt <= issuedBy && (newestPastGrace is null || code.IssuedAt > newestPastGrace.IssuedAt))
                newestPastGrace = code;
        }

        return newestPastGrace ?? newest;
    }
}
