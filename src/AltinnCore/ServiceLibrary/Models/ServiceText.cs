using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// Class representing a resource text
    /// </summary>
    public class ServiceText
    {
        /// <summary>
        /// Gets or sets the key of the resource
        /// </summary>
        public string Key { get; set; }

        /// <summary>
        /// Gets or sets the values of the resource (key / value pairs with language code as the key and the text as value)
        /// </summary>
        public Dictionary<string, string> Values { get; set; }
    }
}
