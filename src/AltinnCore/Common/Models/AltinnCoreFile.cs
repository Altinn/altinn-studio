using System;
using AltinnCore.Common.Enums;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// A entity describing a file that is part of a AltinnCore service
    /// </summary>
    public class AltinnCoreFile
    {
        /// <summary>
        /// Gets or sets the FilePath
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// Gets or sets the FileName
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// Gets or sets the FileType
        /// </summary>
        public string FileType { get; set; }

        /// <summary>
        /// Gets or sets the FileStatus
        /// </summary>
        public AltinnCoreFileStatusType FileStatus { get; set; }

        /// <summary>
        /// Gets or sets the Description
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets the last changed date time 
        /// </summary>
        public DateTime LastChanged { get; set; }
    }
}
