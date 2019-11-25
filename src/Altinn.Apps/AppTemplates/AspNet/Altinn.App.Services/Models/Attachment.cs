namespace Altinn.App.Services.Models
{
    /// <summary>
    /// Attachment metadata
    /// </summary>
    public class Attachment
    {
        /// <summary>
        /// The file name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The id
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// The file size in bytes
        /// </summary>
        public long Size { get; set; }
    }
}
