using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model to request delegation export
    /// </summary>
    public class ExportDelegationsRequestBE
    {
        /// <summary>
        /// Gets or sets the ServiceCode for identifying service
        /// </summary>
        [Required]
        public required string ServiceCode { get; set; }

        /// <summary>
        /// Gets or sets the ServiceEditionCode for identifying service
        /// </summary>
        [Required]
        public int ServiceEditionCode { get; set; }

        /// <summary>
        /// Gets or sets the resourceId
        /// </summary>
        [Required]
        public required string ResourceId { get; set; }

        /// <summary>
        /// Gets or sets the time and date for when to include in delegationExport-batch
        /// </summary>
        [Required]
        public required DateTimeOffset DateTimeForExport { get; set; }
    }
}
