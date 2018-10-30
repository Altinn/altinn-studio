using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Db.Models
{
    public class FormData
    {
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        [JsonProperty(PropertyName = "reporteeId")]
        public string ReporteeId { get; set; }

        [JsonProperty(PropertyName = "reporteeElementId")]
        public string ReporteeElementId { get; set; }

        [JsonProperty(PropertyName = "serviceId")]
        public string ServiceId { get; set; }

        [JsonProperty(PropertyName = "formid")]
        public string FormId { get; set; }

        [JsonProperty(PropertyName = "formDataXml")]
        public string FormDataXml { get; set; }
    }
}
