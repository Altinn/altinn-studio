using System.Collections.Generic;

namespace Altinn.App.Common.Models
{
    /// <summary>
    /// Defines the layout settings
    /// </summary>
    public class LayoutSettings
    {
        /// <summary>
        /// Pages
        /// </summary>
        public Pages Pages { get; set; }

        /// <summary>
        /// Components
        /// </summary>
        public Components Components { get; set; }
    }

    /// <summary>
    /// Pages
    /// </summary>
    public class Pages
    {
        /// <summary>
        /// Order
        /// </summary>
        public List<string> Order { get; set; }

        /// <summary>
        /// Exclude from pdf
        /// </summary>
        public List<string> ExcludeFromPdf { get; set; }
    }

    /// <summary>
    /// Components
    /// </summary>
    public class Components
    {
        /// <summary>
        /// Exclude from pdf
        /// </summary>
        public List<string> ExcludeFromPdf { get; set; }
    }
}
