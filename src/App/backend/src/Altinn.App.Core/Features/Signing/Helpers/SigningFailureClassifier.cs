using System.Net;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>
/// How a failure during signee initialization should be treated.
/// </summary>
internal enum SigningFailureKind
{
    /// <summary>May heal: throw so the engine retries the step.</summary>
    Transient,

    /// <summary>Cannot heal for this signee; fail its workflow step.</summary>
    PermanentPerSignee,

    /// <summary>Cannot heal for any signee: configuration, or a dependency every signee needs.</summary>
    PermanentAppWide,
}

/// <summary>
/// A classified failure: what to do about it, and a short diagnostic safe to persist and to show the engine.
/// </summary>
internal sealed record SigningFailureClassification(SigningFailureKind Kind, HttpStatusCode? Status, string Reason)
{
    public bool IsTransient => Kind == SigningFailureKind.Transient;
}

/// <summary>
/// Decides, for the exceptions the signing clients throw, whether a failure is worth retrying and what to record
/// when it is not. One definition, so the code persisted on a signee and the reason text are assigned together.
/// </summary>
/// <remarks>
/// The first received status in the exception chain decides: 408, 429 and 5xx are transient, every other 4xx is
/// permanent. Wrappers without a status retain the classification of the dependency that failed. Unknown
/// failures receive bounded retries; only a known rejection or explicit configuration/contract failure is
/// permanent. A missing status alone does not establish either success or a permanent rejection.
/// </remarks>
internal static class SigningFailureClassifier
{
    /// <summary>
    /// Correspondence answers a reused idempotency key with 409 Conflict: the message exists, and the send that
    /// produced this exception can be recorded as done.
    /// </summary>
    public static bool IsAlreadySent(Exception exception) =>
        exception is CorrespondenceRequestException { HttpStatusCode: HttpStatusCode.Conflict };

    /// <summary>
    /// Classifies a failure to delegate rights to one signee. Explicit configuration failures are app-wide;
    /// known recipient rejections are permanent for the recipient, and unknown failures receive bounded retries.
    /// </summary>
    public static SigningFailureClassification ClassifyDelegation(Exception exception, CancellationToken ct) =>
        Classify(exception, ct);

    /// <summary>
    /// The code to record for a permanent delegation failure classified by <see cref="ClassifyDelegation"/>.
    /// </summary>
    public static DelegationFailureCode DelegationCode(SigningFailureClassification classification) =>
        classification.Status is not null ? DelegationFailureCode.Rejected : DelegationFailureCode.Unknown;

    /// <summary>
    /// Classifies a failure to send the call to action to one signee. A missing correspondence resource and other
    /// configuration errors are app-wide: no signee can be notified until the app is fixed.
    /// </summary>
    public static SigningFailureClassification ClassifyNotification(Exception exception, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (exception is ConfigurationException or ApplicationConfigException or SigneeProviderNotFoundException)
        {
            return new SigningFailureClassification(SigningFailureKind.PermanentAppWide, null, ShortReason(exception));
        }

        return Classify(exception, ct);
    }

    /// <summary>
    /// The code to record for a permanent notification failure classified by <see cref="ClassifyNotification"/>.
    /// </summary>
    public static NotificationFailureCode NotificationCode(
        Exception exception,
        SigningFailureClassification classification
    )
    {
        if (exception is ConfigurationException or ApplicationConfigException or SigneeProviderNotFoundException)
        {
            return NotificationFailureCode.Configuration;
        }

        return classification.Status is not null ? NotificationFailureCode.Rejected : NotificationFailureCode.Unknown;
    }

    /// <summary>
    /// Classifies a failure to look up a party (the instance owner, the service owner) in Register or the CDN.
    /// Transient failures are retried; anything else is app-wide, since every signee needs the party.
    /// </summary>
    public static SigningFailureClassification ClassifyPartyLookup(Exception exception, CancellationToken ct)
    {
        SigningFailureClassification classification = Classify(exception, ct);
        return classification.IsTransient
            ? classification
            : classification with
            {
                Kind = SigningFailureKind.PermanentAppWide,
            };
    }

    /// <summary>
    /// A short diagnostic for logs, the signee state and the engine's step record: the exception type, the HTTP
    /// status and the problem title when there is one. Never a response body or a validation detail, which can
    /// echo the recipient's identifier.
    /// </summary>
    public static string ShortReason(Exception exception)
    {
        HttpStatusCode? status = StatusOf(exception);
        string? title = exception switch
        {
            CorrespondenceRequestException correspondence => correspondence.ProblemDetails?.Title,
            AccessManagementRequestException accessManagement => accessManagement.ProblemDetails?.Title,
            _ => null,
        };

        string reason = exception.GetType().Name;
        if (status is { } statusCode)
        {
            reason += $" ({(int)statusCode} {statusCode})";
        }

        if (!string.IsNullOrWhiteSpace(title))
        {
            reason += $": {title}";
        }
        else if (exception is ConfigurationException or ApplicationConfigException or SigneeProviderNotFoundException)
        {
            reason += $": {exception.Message}";
        }

        return reason;
    }

    private static SigningFailureClassification Classify(Exception exception, CancellationToken ct)
    {
        // Both platform clients can wrap cancellation. Never turn an aborted callback into a persisted failure.
        ct.ThrowIfCancellationRequested();

        HttpStatusCode? status = StatusOf(exception);
        string reason = ShortReason(exception);

        if (status is { } statusCode)
        {
            return new SigningFailureClassification(
                IsTransientStatus(statusCode) ? SigningFailureKind.Transient : SigningFailureKind.PermanentPerSignee,
                statusCode,
                reason
            );
        }

        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is ConfigurationException or ApplicationConfigException or SigneeProviderNotFoundException)
            {
                return new SigningFailureClassification(SigningFailureKind.PermanentAppWide, null, reason);
            }
            if (current is SigneeInitializationPermanentException)
            {
                return new SigningFailureClassification(SigningFailureKind.PermanentPerSignee, null, reason);
            }
        }
        return new SigningFailureClassification(SigningFailureKind.Transient, null, reason);
    }

    private static HttpStatusCode? StatusOf(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            HttpStatusCode? status = current switch
            {
                AccessManagementRequestException accessManagement => accessManagement.StatusCode,
                CorrespondenceRequestException correspondence => correspondence.HttpStatusCode,
                PlatformHttpException platform => platform.Response.StatusCode,
                HttpRequestException http => http.StatusCode,
                _ => null,
            };
            if (status is not null)
            {
                // An outer response remains authoritative even if its cause carries a different status.
                return status;
            }
        }

        return null;
    }

    private static bool IsTransientStatus(HttpStatusCode status) =>
        status is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests || (int)status is < 400 or >= 500;
}
