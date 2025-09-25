using System;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// This class represents a request to perform a file scan. Instances is sent to a queue
    /// handled by the FileScan system.
    /// </summary>
    public class FileScanRequest
    {
        /// <summary>
        /// Gets or sets the unique id of the data element.
        /// </summary>
        public string DataElementId { get; set; }

        /// <summary>
        /// Gets or sets the unique id of the parent instance of the data element.
        /// </summary>
        /// <remarks>
        /// The instance id contains both the instance owner party id and the unique instance guid.
        /// </remarks>
        public string InstanceId { get; set; }

        /// <summary>
        /// Gets or sets the name of the data element (file)
        /// </summary>
        public string Filename { get; set; }

        /// <summary>
        /// Gets or sets the time when blob was saved.
        /// </summary>
        public DateTimeOffset Timestamp { get; set; }

        /// <summary>
        /// Gets or sets the path to blob storage. Might be nullified in export.
        /// </summary>
        public string BlobStoragePath { get; set; }

        /// <summary>
        /// Gets or sets the application owner identifier
        /// </summary>
        public string Org { get; set; }
    }
}
