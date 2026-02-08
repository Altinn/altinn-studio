using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public sealed class MultipartParserService : IMultipartParserService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/xml",
        "text/xml",
        "application/json",
    };

    public async Task<ParsedFormData> ParseAsync(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var files = new List<UploadedFile>();
        string? callbackUrl = form["callback-url"].FirstOrDefault();

        foreach (var file in form.Files)
        {
            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                throw new InvalidOperationException(
                    $"Content type '{file.ContentType}' is not allowed. Allowed types: {string.Join(", ", AllowedContentTypes)}");
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            files.Add(new UploadedFile(file.FileName, file.ContentType, ms.ToArray()));
        }

        return new ParsedFormData(files, callbackUrl);
    }
}
