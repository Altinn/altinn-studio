using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.App.Services.Models.Validation
{
    /// <summary>
    /// Represents a detailed message from validation.
    /// </summary>
    public class ValidationIssue
    {
        /// <summary>
        /// The seriousness of the identified issue.
        /// </summary>
        [JsonProperty(PropertyName = "severity")]
        [JsonConverter(typeof(StringEnumConverter))]
        public ValidationIssueSeverity Severity { get; set; }

        /// <summary>
        /// The unique id of the specific element with the identified issue.
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string InstanceId { get; set; }

        /// <summary>
        /// The uniqe id of the data element of a given instance with the identified issue.
        /// </summary>
        [JsonProperty(PropertyName = "dataElementId")]
        public string DataElementId { get; set; }

        /// <summary>
        /// A reference to a property the issue is a bout.
        /// </summary>
        [JsonProperty(PropertyName = "field")]
        public string Field { get; set; }

        /// <summary>
        /// A system readable identification of the type of issue.
        /// </summary>
        [JsonProperty(PropertyName = "code")]
        public string Code { get; set; }

        /// <summary>
        /// A human readable description of the issue.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public string Description { get; set; }
    }
}
