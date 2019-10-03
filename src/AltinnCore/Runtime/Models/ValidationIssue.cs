using System;

using Newtonsoft.Json;

namespace AltinnCore.Runtime.Models
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
        public ValidationIssueSeverity Severity { get; set; }

        /// <summary>
        /// A reference to the type of element the issue is about. E.g.: Instance, DataElement etc.
        /// </summary>
        [JsonProperty(PropertyName = "scope")]
        public string Scope { get; set; }

        /// <summary>
        /// A reference to a property the issue is a bout. E.g.: flyttemelding.boadresse
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
