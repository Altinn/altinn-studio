using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model describing the consent metadata for a resource
    /// </summary>
    public class ConsentMetadata
    {
        /// <summary>
        /// Define if metadata is optional
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public bool Optional { get; set; }
    }
}