using System;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record LibraryFile
{
    public string Path { get; set; }
    public string ContentType { get; set; }
    public string? Content { get; set; }
    public string? Url { get; set; }
    public ProblemDetails? Problem { get; set; }

    public LibraryFile(string path, string contentType, string? content = null, string? url = null, ProblemDetails? problem = null)
    {
        if (problem is not null && AtLeastOneHasValue(content, url))
        {
            throw new ArgumentException("Cannot provide content or url when there is a problem.");
        }

        if (problem is null && (BothAreNull(content, url) || BothNotNull(content, url)))
        {
            throw new ArgumentException("Either content or url must be provided when there is no problem.");
        }

        Path = path;
        ContentType = contentType;
        Content = content;
        Url = url;
        Problem = problem;
    }

    private static bool AtLeastOneHasValue(string? first, string? second) => first is not null || second is not null;
    private static bool BothAreNull(string? first, string? second) => first is null && second is null;
    private static bool BothNotNull(string? first, string? second) => first is not null && second is not null;
}
