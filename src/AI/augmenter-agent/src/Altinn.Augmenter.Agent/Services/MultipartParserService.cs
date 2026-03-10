using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services;

public sealed class MultipartParserService(IOptions<UploadOptions> uploadOptions) : IMultipartParserService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/xml",
        "text/xml",
        "application/json",
    };

    public async Task<ParsedFormData> ParseAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        var limits = uploadOptions.Value;
        var form = await request.ReadFormAsync(cancellationToken);
        var files = new List<UploadedFile>();
        string? callbackUrl = form["callback-url"].FirstOrDefault();
        long totalBytes = 0;

        foreach (var file in form.Files)
        {
            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                throw new InvalidOperationException(
                    $"Content type '{file.ContentType}' is not allowed. Allowed types: {string.Join(", ", AllowedContentTypes)}");
            }

            if (file.Length > limits.MaxFileBytes)
            {
                throw new InvalidOperationException(
                    $"File '{file.FileName}' exceeds maximum size of {limits.MaxFileBytes} bytes.");
            }

            totalBytes += file.Length;
            if (totalBytes > limits.MaxTotalBytes)
            {
                throw new InvalidOperationException(
                    $"Total upload size exceeds maximum of {limits.MaxTotalBytes} bytes.");
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, cancellationToken);
            files.Add(new UploadedFile(file.FileName, file.ContentType, ms.ToArray()));
        }

        return new ParsedFormData(files, callbackUrl);
    }
}
