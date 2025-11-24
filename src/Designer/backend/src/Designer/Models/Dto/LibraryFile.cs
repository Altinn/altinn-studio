using System;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record LibraryFile
{
    public string Path { get; set; }
    public string ContentType { get; set; }

    [MemberNotNullWhen(true, nameof(Url))]
    public string? Content { get; set; }

    [MemberNotNullWhen(true, nameof(Content))]
    public string? Url { get; set; }

    public LibraryFile(string path, string contentType, string? content, string? url)
    {
        if ((content is null && url is null) || (content is not null && url is not null))
        {
            throw new ArgumentException("Exactly one of content or url must be provided.");
        }

        Path = path;
        ContentType = contentType;
        Content = content;
        Url = url;
    }
}
