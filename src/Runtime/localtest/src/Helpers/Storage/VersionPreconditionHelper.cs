#nullable enable

using System.Globalization;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// Parses version precondition headers and writes current version response headers.
/// </summary>
public static class VersionPreconditionHelper
{
    /// <summary>
    /// Parses both optional version precondition headers.
    /// </summary>
    public static (VersionPreconditions Preconditions, ActionResult? Error) TryParse(
        HttpRequest request
    )
    {
        (int? expectedInstanceVersion, ActionResult? instanceError) = TryParseHeader(
            request,
            StorageHeaders.IfInstanceVersionMatch
        );
        if (instanceError is not null)
        {
            return (VersionPreconditions.None, instanceError);
        }

        (int? expectedProcessStateVersion, ActionResult? processError) = TryParseHeader(
            request,
            StorageHeaders.IfProcessStateVersionMatch
        );
        if (processError is not null)
        {
            return (VersionPreconditions.None, processError);
        }

        return (
            new VersionPreconditions(expectedInstanceVersion, expectedProcessStateVersion),
            null
        );
    }

    /// <summary>
    /// Writes current version response headers.
    /// </summary>
    public static void WriteVersionResponseHeaders(
        HttpResponse response,
        int instanceVersion,
        int processStateVersion
    )
    {
        response.Headers[StorageHeaders.InstanceVersion] = instanceVersion.ToString(
            CultureInfo.InvariantCulture
        );
        response.Headers[StorageHeaders.ProcessStateVersion] = processStateVersion.ToString(
            CultureInfo.InvariantCulture
        );
    }

    /// <summary>
    /// Writes current version response headers.
    /// </summary>
    public static void WriteVersionResponseHeaders(
        HttpResponse response,
        InstanceVersionResult versions
    )
    {
        WriteVersionResponseHeaders(
            response,
            versions.InstanceVersion,
            versions.ProcessStateVersion
        );
    }

    /// <summary>
    /// Writes current version response headers.
    /// </summary>
    public static void WriteVersionResponseHeaders<T>(
        HttpResponse response,
        DataElementWriteResult<T> result
    )
    {
        WriteVersionResponseHeaders(response, result.InstanceVersion, result.ProcessStateVersion);
    }

    /// <summary>
    /// Creates a 412 response for a version mismatch and writes current version headers.
    /// </summary>
    public static ObjectResult VersionMismatch(
        HttpResponse response,
        StorageVersionMismatchException exception
    )
    {
        WriteVersionResponseHeaders(
            response,
            exception.CurrentInstanceVersion,
            exception.CurrentProcessStateVersion
        );

        string code = exception switch
        {
            InstanceVersionMismatchException => "instance_version_mismatch",
            ProcessStateVersionMismatchException => "process_state_version_mismatch",
            _ => "version_mismatch",
        };

        return new ObjectResult(
            new ProblemDetails
            {
                Status = StatusCodes.Status412PreconditionFailed,
                Type = code,
                Title = exception.Message,
            }
        )
        {
            StatusCode = StatusCodes.Status412PreconditionFailed,
        };
    }

    private static (int? Value, ActionResult? Error) TryParseHeader(
        HttpRequest request,
        string headerName
    )
    {
        if (!request.Headers.TryGetValue(headerName, out StringValues values))
        {
            return (null, null);
        }

        if (
            values.Count != 1
            || string.IsNullOrWhiteSpace(values[0])
            || !int.TryParse(
                values[0],
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out int parsed
            )
            || parsed <= 0
        )
        {
            return (null, MalformedVersionPreconditionProblem(headerName));
        }

        if (parsed == int.MaxValue)
        {
            return (null, ReservedMaxVersionPreconditionProblem(headerName));
        }

        return (parsed, null);
    }

    private static BadRequestObjectResult MalformedVersionPreconditionProblem(string headerName) =>
        new(
            new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Type = "malformed_version_precondition",
                Title = $"{headerName} must be a positive 32-bit integer.",
            }
        );

    private static BadRequestObjectResult ReservedMaxVersionPreconditionProblem(
        string headerName
    ) =>
        new(
            new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Type = "reserved_version_precondition",
                Title = $"{headerName} value {int.MaxValue} is reserved.",
            }
        );
}

/// <summary>
/// Optional version preconditions from request headers.
/// </summary>
public sealed record VersionPreconditions(int? InstanceVersion, int? ProcessStateVersion)
{
    /// <summary>
    /// Empty version preconditions.
    /// </summary>
    public static VersionPreconditions None { get; } = new(null, null);
}
