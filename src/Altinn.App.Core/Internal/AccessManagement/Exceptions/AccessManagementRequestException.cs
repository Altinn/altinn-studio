using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.AccessManagement.Exceptions;

internal sealed class AccessManagementRequestException : AccessManagementException
{
    internal ProblemDetails? ProblemDetails { get; init; }
    internal HttpStatusCode? StatusCode { get; init; }
    internal string? ResponseBody { get; init; }

    public AccessManagementRequestException() { }

    public AccessManagementRequestException(string? message)
        : base(message) { }

    public AccessManagementRequestException(string? message, Exception? innerException)
        : base(message, innerException) { }

    public AccessManagementRequestException(
        string? message,
        ProblemDetails? problemDetails,
        HttpStatusCode? statusCode,
        string? responseBody
    )
        : base(message)
    {
        ProblemDetails = problemDetails;
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }

    public AccessManagementRequestException(
        string? message,
        ProblemDetails? problemDetails,
        HttpStatusCode? statusCode,
        string? responseBody,
        Exception? innerException
    )
        : base(message, innerException)
    {
        ProblemDetails = problemDetails;
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }
}
