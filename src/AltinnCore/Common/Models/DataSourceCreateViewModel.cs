using System.ComponentModel.DataAnnotations;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// View model for the create view model
    /// </summary>
    public class DataSourceCreateViewModel
    {
        /// <summary>
        /// Gets or sets the URL to the external REST API
        /// </summary>
        [Required]
        public string Url { get; set; }

        /// <summary>
        /// Gets or sets description of the service
        /// </summary>
        [Required]
        public string Description { get; set; }
    }
}
