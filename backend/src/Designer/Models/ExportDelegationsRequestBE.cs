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
        public string ServiceCode { get; set; }

        /// <summary>
        /// Gets or sets the ServiceEditionCode for identifying service
        /// </summary>
        [Required]
        public int ServiceEditionCode { get; set; }

        /// <summary>
        /// Gets or sets the resourceId
        /// </summary>
        [Required]
        public string ResourceId { get; set; }

        /// <summary>
        /// Gets or sets the time and date for when to include in delegationExport-batch
        /// </summary>
        [Required]
        public DateTime DateTimeForExport { get; set; }
    }
}
