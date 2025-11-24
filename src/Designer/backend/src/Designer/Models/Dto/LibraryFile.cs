using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record LibraryFile
{
    public string Path { get; set; }
    public string ContentType { get; set; }

    [MemberNotNullWhen(false, nameof(Url))]
    public string? Content { get; set; }

    [MemberNotNullWhen(false, nameof(Content))]
    public string? Url { get; set; }

    public LibraryFile(string path, string contentType, string? content, string? url)
    {
        Path = path;
        ContentType = contentType;
        Content = content;
        Url = url;
    }
}
