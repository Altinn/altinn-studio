using System;
using System.Net;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// The run API answered with an error. A failure to reach the operator stays an <see cref="System.Net.Http.HttpRequestException"/>.
/// </summary>
internal sealed class OperatorException : Exception
{
    /// <summary>
    /// Creates the exception from the status and the problem details the operator answered with.
    /// </summary>
    public OperatorException(HttpStatusCode statusCode, string? title, string? detail)
        : base(CreateMessage(statusCode, title, detail))
    {
        StatusCode = statusCode;
        Title = title;
        Detail = detail;
    }

    /// <summary>
    /// The status the operator answered with, such as 429 when the caller's queue for the kind is full.
    /// </summary>
    public HttpStatusCode StatusCode { get; }

    /// <summary>
    /// The title of the problem details, if the operator sent one.
    /// </summary>
    public string? Title { get; }

    /// <summary>
    /// The detail of the problem details, or the start of the body when it was not problem details.
    /// </summary>
    public string? Detail { get; }

    private static string CreateMessage(HttpStatusCode statusCode, string? title, string? detail)
    {
        string message = $"core-operator answered {(int)statusCode}";
        if (!string.IsNullOrWhiteSpace(title))
        {
            message += $" {title}";
        }
        if (!string.IsNullOrWhiteSpace(detail))
        {
            message += $": {detail}";
        }
        return message;
    }
}
