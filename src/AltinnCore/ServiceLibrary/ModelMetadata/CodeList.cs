using System.Collections.Generic;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a code list
    /// </summary>
    public class CodeList : List<CodeListItem>
    {
    }

    /// <summary>
    /// Class representing a code list item
    /// </summary>
    public class CodeListItem
    {
        /// <summary>
        /// Gets or sets the values of this item (key / value pairs)
        /// </summary>
        public Dictionary<string, string> Values { get; set; }

        /// <summary>
        /// Gets or sets the text for this item
        /// </summary>
        public CultureString Text { get; set; }
    }
}
