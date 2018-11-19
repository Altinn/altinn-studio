using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.Db.Models
{
    /// <summary>
    /// Model for form data
    /// </summary>
    public class FormData
    {
        /// <summary>
        /// unique Id 
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// owner of the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeId")]
        public string ReporteeId { get; set; }

        /// <summary>
        /// Id of the inbox element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeElementId")]
        public string ReporteeElementId { get; set; }

        /// <summary>
        /// Id of the service
        /// </summary>
        [JsonProperty(PropertyName = "serviceId")]
        public string ServiceId { get; set; }

        /// <summary>
        /// Id of the form
        /// </summary>
        [JsonProperty(PropertyName = "formid")]
        public string FormId { get; set; }

        /// <summary>
        /// form data in xml format
        /// </summary>
        [JsonProperty(PropertyName = "formDataXml")]
        public string FormDataXml { get; set; }
    }
}
