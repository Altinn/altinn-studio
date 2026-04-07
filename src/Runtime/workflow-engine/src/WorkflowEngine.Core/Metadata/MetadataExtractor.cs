using Microsoft.AspNetCore.Http;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Extracts workflow metadata from HTTP headers and query parameters.
/// For each field, accepts either a header or a query parameter — returns 400 if both are supplied.
/// </summary>
internal static class MetadataExtractor
{
    /// <summary>
    /// Extracts metadata fields needed for workflow enqueue: idempotency key and correlation ID.
    /// Namespace is provided from the URL route parameter.
    /// Returns 400 if idempotency key is missing, if both header and query param are supplied for any field,
    /// or if correlation ID is present but not a valid GUID.
    /// </summary>
    public static InboundMetadata ExtractEnqueueMetadata(HttpContext httpContext, string @namespace)
    {
        var correlationId = ExtractCorrelationId(httpContext);
        var idempotencyKey = ExtractIdempotencyKey(httpContext);

        return new InboundMetadata(@namespace, idempotencyKey, correlationId);
    }

    public static string ExtractIdempotencyKey(HttpContext httpContext)
    {
        var value = ExtractSingleValue(
            httpContext,
            WorkflowMetadataConstants.Headers.IdempotencyKey,
            WorkflowMetadataConstants.QueryParams.IdempotencyKey
        );

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new BadHttpRequestException(
                $"Idempotency key is required. Supply it via the '{WorkflowMetadataConstants.Headers.IdempotencyKey}' header "
                    + $"or '{WorkflowMetadataConstants.QueryParams.IdempotencyKey}' query parameter."
            );
        }

        return value;
    }

    public static Guid? ExtractCorrelationId(HttpContext httpContext)
    {
        var raw = ExtractSingleValue(
            httpContext,
            WorkflowMetadataConstants.Headers.CorrelationId,
            WorkflowMetadataConstants.QueryParams.CorrelationId
        );

        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!Guid.TryParse(raw, out var parsed))
        {
            throw new BadHttpRequestException($"Correlation ID '{raw}' is not a valid GUID.");
        }

        return parsed;
    }

    /// <summary>
    /// Reads a value from either a header or a query parameter.
    /// Throws 400 if both are present.
    /// </summary>
    private static string? ExtractSingleValue(HttpContext httpContext, string headerName, string queryParamName)
    {
        string? fromHeader = null;
        if (httpContext.Request.Headers.TryGetValue(headerName, out var headerValues))
        {
            if (headerValues.Count > 1)
            {
                throw new BadHttpRequestException(
                    $"Header '{headerName}' was supplied multiple times. Supply it exactly once."
                );
            }

            fromHeader = headerValues.ToString();
        }

        string? fromQuery = null;
        if (httpContext.Request.Query.TryGetValue(queryParamName, out var queryValues))
        {
            if (queryValues.Count > 1)
            {
                throw new BadHttpRequestException(
                    $"Query parameter '{queryParamName}' was supplied multiple times. Supply it exactly once."
                );
            }

            fromQuery = queryValues.ToString();
        }

        // Treat empty strings as absent
        if (string.IsNullOrWhiteSpace(fromHeader))
            fromHeader = null;
        if (string.IsNullOrWhiteSpace(fromQuery))
            fromQuery = null;

        if (fromHeader is not null && fromQuery is not null)
        {
            throw new BadHttpRequestException(
                $"'{headerName}' was supplied as both a header and a query parameter ('{queryParamName}'). Supply only one."
            );
        }

        return fromHeader ?? fromQuery;
    }
}
