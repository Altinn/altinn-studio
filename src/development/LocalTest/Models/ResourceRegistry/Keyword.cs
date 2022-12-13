using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.ResourceRegistry.Core.Models
{
    /// <summary>
    /// Model for defining keywords
    /// </summary>
    public class Keyword
    {
        /// <summary>
        /// The key word
        /// </summary>
        public string Word { get; set; } 

        /// <summary>
        /// Language of the key word
        /// </summary>
        public string Language { get; set; }
    }
}
