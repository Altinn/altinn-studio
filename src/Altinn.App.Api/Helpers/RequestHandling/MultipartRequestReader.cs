using System.Globalization;
using Altinn.App.Core.Helpers.Extensions;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace Altinn.App.Api.Helpers.RequestHandling;

/// <summary>
/// Represents a reader that can read a multipart http request and split it in data elements.
/// </summary>
public class MultipartRequestReader
{
    private readonly HttpRequest _request;

    /// <summary>
    /// Initializes a new instance of the <see cref="MultipartRequestReader"/> class with a <see cref="HttpRequest"/>.
    /// </summary>
    /// <param name="request">The <see cref="HttpRequest"/> to be read.</param>
    public MultipartRequestReader(HttpRequest request)
    {
        _request = request;
        Parts = new List<RequestPart>();
        Errors = new List<string>();
    }

    /// <summary>
    /// Gets a value indicating whether the request has multiple parts using the request content type.
    /// </summary>
    public bool IsMultipart
    {
        get
        {
            return !string.IsNullOrEmpty(_request.ContentType)
                && _request.ContentType.Contains("multipart/", StringComparison.OrdinalIgnoreCase);
        }
    }

    /// <summary>
    /// Gets a list of all parts.
    /// </summary>
    public List<RequestPart> Parts { get; }

    /// <summary>
    /// Gets a list of errors.
    /// </summary>
    public List<string> Errors { get; }

    /// <summary>
    /// Process the request and generate parts.
    /// </summary>
    /// <returns>A <see cref="Task"/> representing the result of the asynchronous operation.</returns>
    public async Task Read()
    {
        if (IsMultipart)
        {
            int partCounter = 0;
            try
            {
                MultipartReader reader = new MultipartReader(GetBoundary(), _request.Body);

                MultipartSection? section;
                while ((section = await reader.ReadNextSectionAsync()) != null)
                {
                    partCounter++;

                    if (
                        !ContentDispositionHeaderValue.TryParse(
                            section.ContentDisposition,
                            out ContentDispositionHeaderValue? contentDisposition
                        )
                    )
                    {
                        Errors.Add(
                            string.Format(
                                CultureInfo.InvariantCulture,
                                "Part number {0} doesn't have a content disposition",
                                partCounter
                            )
                        );
                        continue;
                    }

                    if (section.ContentType == null)
                    {
                        Errors.Add(
                            string.Format(
                                CultureInfo.InvariantCulture,
                                "Part number {0} doesn't have a content type",
                                partCounter
                            )
                        );
                        continue;
                    }

                    string? sectionName = contentDisposition.Name.Value;
                    string? contentFileName = null;
                    if (contentDisposition.FileNameStar.HasValue)
                    {
                        contentFileName = contentDisposition.FileNameStar.Value;
                    }
                    else if (contentDisposition.FileName.HasValue)
                    {
                        contentFileName = contentDisposition.FileName.Value;
                    }

                    // We actively remove quotes because we don't want them replaced with '_'.
                    // Quotes around filename in Content-Disposition is valid, but not as part of the filename.
                    contentFileName = contentFileName?.Trim('\"').AsFileName(false);

                    long fileSize = contentDisposition.Size ?? 0;

                    MemoryStream memoryStream = new MemoryStream();
                    await section.Body.CopyToAsync(memoryStream);
                    memoryStream.Position = 0;

                    Parts.Add(
                        new RequestPart()
                        {
                            ContentType = section.ContentType,
                            Name = sectionName,
                            Stream = memoryStream,
                            FileName = contentFileName,
                            FileSize = fileSize,
                        }
                    );
                }
            }
            catch (IOException ioex)
            {
                Errors.Add("IOException while reading a section of the request: " + ioex.Message);
            }
        }
        else
        {
            // create part of content
            if (_request.ContentType != null)
            {
                Parts.Add(new RequestPart() { ContentType = _request.ContentType, Stream = _request.Body });
            }
        }
    }

    private string GetBoundary()
    {
        MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(_request.ContentType);
        return mediaType.Boundary.Value?.Trim('"')
            ?? throw new Exception("Could not retrieve boundary value from Content-Type header");
    }
}
