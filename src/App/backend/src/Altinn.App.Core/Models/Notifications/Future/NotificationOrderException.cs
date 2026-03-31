using System.Globalization;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Models.Notifications.Future;

/// <summary>
/// Exception thrown when a notification order could not be created.
/// </summary>
public sealed class NotificationOrderException : AltinnException
{
    internal string? ResponseContent { get; }

    internal NotificationOrderException(
        string? message,
        HttpResponseMessage? response,
        string? content,
        Exception? innerException
    )
        : base(
            $"{message}: StatusCode={(int?)response?.StatusCode} Reason={response?.ReasonPhrase} BodyLength={content?.Length ?? 0}",
            innerException
        )
    {
        ResponseContent = content;
    }

    private static string BuildMessage(string? message, HttpResponseMessage? response, string? content)
    {
        var sb = new StringBuilder();
        sb.Append(message);
        sb.Append(
            CultureInfo.InvariantCulture,
            $": StatusCode={(int?)response?.StatusCode} Reason={response?.ReasonPhrase}"
        );

        if (content is not null)
        {
            try
            {
                var problem = JsonSerializer.Deserialize<ProblemDetails>(content);
                if (problem is not null)
                {
                    sb.Append(CultureInfo.InvariantCulture, $" Title={problem.Title}");
                    if (problem.Extensions.TryGetValue("errors", out var errors))
                        sb.Append(CultureInfo.InvariantCulture, $" Errors={errors}");
                    return sb.ToString();
                }
            }
            catch (JsonException) { }
        }

        return sb.ToString();
    }
}
