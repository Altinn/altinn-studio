using System;
using System.ComponentModel.DataAnnotations;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// View model for the data source
    /// </summary>
    public class DataSourceEditViewModel : DataSourceCreateViewModel
    {
        /// <summary>
        /// Gets or sets the Id
        /// </summary>
        public string Id { get; set; }
      
        /// <summary>
        /// Gets or sets the date for when created
        /// </summary>
        [Required]
        public DateTime Opprettet { get; set; }
    }
}
