using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
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
