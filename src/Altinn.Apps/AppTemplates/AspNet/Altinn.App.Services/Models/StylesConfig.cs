using System.Collections.Generic;

namespace Altinn.App.Services.Models
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
