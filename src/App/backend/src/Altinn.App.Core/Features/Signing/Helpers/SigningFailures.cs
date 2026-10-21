using System.Net;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>
/// Sorts the failures of the platform calls signee initialization makes into those a retry can fix and those it
/// cannot, so each step knows whether to fail for the workflow engine to retry or to record the failure on the
/// signee and carry on.
/// </summary>
internal static class SigningFailures
{
    /// <summary>
    /// Whether the same call may succeed if it is made again: there was no response (a network error or a
    /// timeout), or the response was 408, 429 or a server error. A configuration error is never transient.
    /// </summary>
    public static bool IsTransient(Exception exception)
    {
        if (IsAppConfigurationFailure(exception))
        {
            return false;
        }

        return StatusOf(exception) switch
        {
            null => true,
            HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests => true,
            HttpStatusCode status => (int)status >= 500,
        };
    }

    /// <summary>
    /// Whether the failure is about the one signee the call concerned rather than the app: a client error other
    /// than 401, 403, 408 and 429. A rejected credential, a timeout or throttling would fail every signee alike.
    /// </summary>
    public static bool ConcernsOnlyTheSignee(Exception exception) =>
        !IsAppConfigurationFailure(exception)
        && StatusOf(exception) is { } status
        && (int)status is >= 400 and < 500
        && status
            is not HttpStatusCode.Unauthorized
                and not HttpStatusCode.Forbidden
                and not HttpStatusCode.RequestTimeout
                and not HttpStatusCode.TooManyRequests;

    /// <summary>
    /// Whether Correspondence refused a message because one with the same idempotency key already exists — that
    /// is, an earlier attempt sent it.
    /// </summary>
    public static bool IsAlreadySent(Exception exception) =>
        exception is CorrespondenceRequestException { HttpStatusCode: HttpStatusCode.Conflict };

    private static bool IsAppConfigurationFailure(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is ConfigurationException or MaskinportenConfigurationException)
            {
                return true;
            }
        }

        return false;
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
                return status;
            }
        }

        return null;
    }
}
