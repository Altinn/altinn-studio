using System.Collections.Generic;
using System.Linq;

using Altinn.Platform.Storage.Models;

namespace AltinnCore.Runtime.RequestHandling
{
    /// <summary>
    /// Represents a validator of a single <see cref="RequestPart"/> with the help of app metadata
    /// </summary>
    public class RequestPartValidator
    {
        private readonly Application appInfo;

        /// <summary>
        /// Initializes a new instance of the <see cref="RequestPartValidator"/> class with the given application info.
        /// </summary>
        /// <param name="appInfo">The application metadata to use when validating a <see cref="RequestPart"/>.</param>
        public RequestPartValidator(Application appInfo)
        {
            this.appInfo = appInfo;
        }

        /// <summary>
        /// Operation that can validate a <see cref="RequestPart"/> using the internal <see cref="Application"/>.
        /// </summary>
        /// <param name="part">The request part to be validated.</param>
        /// <returns>null if no errors where found. Otherwise an error message.</returns>
        public string ValidatePart(RequestPart part)
        {
            if (part.Name == "instance")
            {
                if (!part.ContentType.StartsWith("application/json"))
                {
                    return $"Unexpected Content-Type '{part.ContentType}' of embedded instance template. Expecting 'application/json'";
                }

                //// TODO: Validate that the element can be read as an instance?
            }
            else
            {
                ElementType elementType = appInfo.ElementTypes.Find(e => e.Id == part.Name);

                if (elementType == null)
                {
                    return $"Multipart section named, '{part.Name}' does not correspond to an element type in application metadata";
                }

                if (part.ContentType == null)
                {
                    return $"The multipart section named {part.Name} is missing Content-Type.";
                }
                else
                {
                    string contentTypeWithoutEncoding = part.ContentType.Split(";")[0];

                    // TODO: Support for any content type?
                    if (!elementType.AllowedContentType.Contains(contentTypeWithoutEncoding))
                    {
                        return $"The multipart section named {part.Name} has a Content-Type '{part.ContentType}' which is invalid for element type '{elementType}'";
                    }
                }

                long contentSize = part.FileSize != 0 ? part.FileSize : part.Stream.Length;

                if (contentSize == 0)
                {
                    return $"The multipart section named {part.Name} has no data. Cannot process empty part.";
                }

                if (elementType.MaxSize.HasValue && contentSize > elementType.MaxSize.Value)
                {
                    return $"The multipart section named {part.Name} exceeds the size limit of element type '{elementType}'";
                }
            }

            return null;
        }

        /// <summary>
        /// Operation that can validate a list of <see cref="RequestPart"/> elements using the internal <see cref="Application"/>.
        /// </summary>
        /// <param name="parts">The list of request parts to be validated.</param>
        /// <returns>null if no errors where found. Otherwise an error message.</returns>
        public string ValidateParts(List<RequestPart> parts)
        {
            foreach (RequestPart part in parts)
            {
                string partError = ValidatePart(part);
                if (partError != null)
                {
                    return partError;
                }
            }

            foreach (ElementType elementType in appInfo.ElementTypes)
            {
                if (elementType.MaxCount > 0)
                {
                    int partCount = parts.Count(p => p.Name == elementType.Id);
                    if (elementType.MaxCount < partCount)
                    {
                        return $"The list of parts contains more elements of type '{elementType.Id}' than the element type allows.";
                    }
                }
            }

            return null;
        }
    }
}
