namespace Altinn.App.Api.Helpers.RequestHandling
{
    /// <summary>
    /// A helper to organise the parts in a multipart
    /// </summary>
    public class RequestPart
    {
        /// <summary>
        /// The stream to access this part.
        /// </summary>
#nullable disable
        public Stream Stream { get; set; }

#nullable restore

        /// <summary>
        /// The file name as given in content description.
        /// </summary>
        public string? FileName { get; set; }

        /// <summary>
        /// The parts name.
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// The content type of the part.
        /// </summary>
#nullable disable
        public string ContentType { get; set; }

#nullable restore

        /// <summary>
        /// The file size of the part, 0 if not given.
        /// </summary>
        public long FileSize { get; set; }
    }
}
