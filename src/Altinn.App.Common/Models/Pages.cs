using System.Collections.Generic;

namespace Altinn.App.Common.Models
{
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
}
