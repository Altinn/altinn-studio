using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for form data
    /// </summary>
    [Serializable]
    public class Data
    {
        /// <summary>
        /// unique Id 
        /// </summary>
        [JsonProperty(PropertyName = "fileName")]
        public string FileName { get; set; }

        /// <summary>
        /// form data in xml format
        /// </summary>
        [JsonProperty(PropertyName = "formDataXml")]
        public string FormDataXml { get; set; }

        /// <summary>
        /// form data in xml format
        /// </summary>
        [JsonProperty(PropertyName = "attachmentData")]
        public string AttachmentData { get; set; }

        /// <summary>
        /// form data in xml format
        /// </summary>
        [JsonProperty(PropertyName = "dataType")]
        public string DataType { get; set; }
    }
}
