using System.Globalization;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Models.Result;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace Altinn.App.Api.Helpers.RequestHandling;

/// <summary>
/// Represents a reader that can read a multipart http request and split it in data elements.
/// </summary>
public static class MultipartRequestReader
{
    /// <summary>
    /// Gets a value indicating whether the request has multiple parts using the request content type.
    /// </summary>
    private static bool IsMultipart(HttpRequest request)
    {
        return !string.IsNullOrEmpty(request.ContentType)
            && request.ContentType.Contains("multipart/", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Process the request and generate parts.
    /// </summary>
    /// <returns>A <see cref="Task"/> representing the result of the asynchronous operation.</returns>
    public static async Task<ServiceResult<List<RequestPart>, ProblemDetails>> Read(HttpRequest request)
    {
        List<RequestPart> parts = [];
        List<string> errors = [];
        if (IsMultipart(request))
        {
            int partCounter = 0;
            try
            {
                MultipartReader reader = new MultipartReader(GetBoundary(request), request.Body);

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
                        errors.Add(
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
                        errors.Add(
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

                    int fileSize = (int?)contentDisposition.Size ?? 0;

                    using MemoryStream memoryStream = new MemoryStream(fileSize);
                    await section.Body.CopyToAsync(memoryStream);
                    memoryStream.Position = 0;

                    parts.Add(
                        new RequestPart()
                        {
                            ContentType = section.ContentType,
                            Name = sectionName,
                            Bytes = memoryStream.ToArray(),
                            FileName = contentFileName,
                        }
                    );
                }
            }
            catch (IOException ioex)
            {
                errors.Add("IOException while reading a section of the request: " + ioex.Message);
            }
        }
        else
        {
            // create part of content
            if (request.ContentType != null)
            {
                using var memoryStream = new MemoryStream();
                await request.Body.CopyToAsync(memoryStream);
                parts.Add(
                    new RequestPart
                    {
                        ContentType = request.ContentType,
                        Bytes = memoryStream.ToArray(),
                        FileName = null,
                        Name = null,
                    }
                );
            }
            // Else assume the request body is empty
        }

        if (errors.Count > 0)
        {
            return new ProblemDetails()
            {
                Title = "Error reading request",
                Detail = string.Join(", ", errors),
                Status = StatusCodes.Status400BadRequest,
            };
        }

        return parts;
    }

    private static string GetBoundary(HttpRequest request)
    {
        MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
        return mediaType.Boundary.Value?.Trim('"')
            ?? throw new Exception("Could not retrieve boundary value from Content-Type header");
    }
}
