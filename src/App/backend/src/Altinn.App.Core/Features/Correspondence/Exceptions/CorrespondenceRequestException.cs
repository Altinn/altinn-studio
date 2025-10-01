using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Features.Correspondence.Exceptions;

/// <summary>
/// An exception that indicates an error was returned from the correspondence server.
/// </summary>
public class CorrespondenceRequestException : CorrespondenceException
{
    /// <summary>
    /// Problem details object from the Correspondence API server, if available.
    /// </summary>
    public ProblemDetails? ProblemDetails { get; init; }

    /// <summary>
    /// Http status code related to the request, if available.
    /// </summary>
    public HttpStatusCode? HttpStatusCode { get; init; }

    /// <summary>
    /// The request body, if available.
    /// </summary>
    public string? ResponseBody { get; init; }

    /// <inheritdoc/>
    public CorrespondenceRequestException() { }

    /// <inheritdoc/>
    public CorrespondenceRequestException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public CorrespondenceRequestException(
        string? message,
        ProblemDetails? problemDetails,
        HttpStatusCode? httpStatusCode,
        string? responseBody
    )
        : base(message)
    {
        ProblemDetails = problemDetails;
        HttpStatusCode = httpStatusCode;
        ResponseBody = responseBody;
    }

    /// <inheritdoc/>
    public CorrespondenceRequestException(
        string? message,
        ProblemDetails? problemDetails,
        HttpStatusCode? httpStatusCode,
        string? responseBody,
        Exception? innerException
    )
        : base(message, innerException)
    {
        ProblemDetails = problemDetails;
        HttpStatusCode = httpStatusCode;
        ResponseBody = responseBody;
    }

    /// <inheritdoc/>
    public CorrespondenceRequestException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
