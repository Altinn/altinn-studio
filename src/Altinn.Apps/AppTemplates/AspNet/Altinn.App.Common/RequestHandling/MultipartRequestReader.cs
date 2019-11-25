using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace Altinn.App.Common.RequestHandling
{
    /// <summary>
    /// Represents a reader that can read a multipart http request and split it in data elements.
    /// </summary>
    public class MultipartRequestReader
    {
        private readonly HttpRequest request;

        /// <summary>
        /// Initializes a new instance of the <see cref="MultipartRequestReader"/> class with a <see cref="HttpRequest"/>.
        /// </summary>
        /// <param name="request">The <see cref="HttpRequest"/> to be read.</param>
        public MultipartRequestReader(HttpRequest request)
        {
            this.request = request;
            this.Parts = new List<RequestPart>();
            this.Errors = new List<string>();
        }

        /// <summary>
        /// Gets a value indicating whether the request has multiple parts using the request content type.
        /// </summary>
        public bool IsMultipart
        {
            get
            {
                return !string.IsNullOrEmpty(request.ContentType) 
                  && request.ContentType.IndexOf("multipart/", StringComparison.OrdinalIgnoreCase) >= 0;
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
                    MultipartReader reader = new MultipartReader(GetBoundary(), request.Body);

                    MultipartSection section;
                    while ((section = await reader.ReadNextSectionAsync()) != null)
                    {
                        partCounter++;

                        bool hasContentDispositionHeader = ContentDispositionHeaderValue
                               .TryParse(section.ContentDisposition, out ContentDispositionHeaderValue contentDisposition);

                        if (!hasContentDispositionHeader)
                        {
                            Errors.Add(string.Format("Part number {0} doesn't have a content disposition", partCounter));
                            continue;
                        }

                        if (section.ContentType == null)
                        {
                            Errors.Add(string.Format("Part number {0} doesn't have a content type", partCounter));
                            continue;
                        }

                        string sectionName = contentDisposition.Name.HasValue ? contentDisposition.Name.Value : null;
                        string contentFileName = contentDisposition.FileName.HasValue ? contentDisposition.FileName.Value : null;
                        long fileSize = contentDisposition.Size ?? 0;

                        MemoryStream memoryStream = new MemoryStream();
                        await section.Body.CopyToAsync(memoryStream);
                        memoryStream.Position = 0;

                        Parts.Add(new RequestPart()
                        {
                            ContentType = section.ContentType,
                            Name = sectionName,
                            Stream = memoryStream,
                            FileName = contentFileName,
                            FileSize = fileSize,
                        });
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
                if (request.ContentType != null)
                {
                    Parts.Add(new RequestPart()
                    {
                        ContentType = request.ContentType,
                        Stream = request.Body
                    });
                }
            }
        }

        private string GetBoundary()
        {
            MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
            return mediaType.Boundary.Value.Trim('"');
        }
    }
}
