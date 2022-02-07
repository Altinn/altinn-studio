using System.Collections.Generic;

namespace Altinn.App.Common.Models
{
    /// <summary>
    /// Represents a collection of options for a dropdown selector or similar use.
    /// </summary>
    public class AppOptions
    {
        /// <summary>
        /// Gets or sets the list of options.
        /// </summary>
        public List<AppOption> Options { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the options can be cached.
        /// </summary>
        public bool IsCacheable { get; set; }
    }
}
