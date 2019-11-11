using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Convenience type to handle multiple languages in a string.
    /// </summary>
    public class LanguageString : Dictionary<string, string>
    {
        /// <summary>
        /// public constructor
        /// </summary>
        public LanguageString()
        {
        }       
    }
}
