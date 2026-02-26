#nullable disable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class for style config
    /// </summary>
    public class StylesConfig
    {
        /// <summary>
        /// The internal styles
        /// </summary>
        public List<string> InternalStyles { get; set; }

        /// <summary>
        /// The external styles
        /// </summary>
        public List<string> ExternalStyles { get; set; }
    }
}
