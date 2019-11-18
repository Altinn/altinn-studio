using System.Collections.Generic;
using System.ComponentModel;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model for applications data type.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class DataType
    {
        /// <summary>
        /// The data type id. It must be unique within the scope of an application.
        /// Logical name of the schema of which data elements should be validated against.
        /// Should be in lower case and can only contain letters, dash and numbers. No space or slashes are allowed.
        /// Examples are: main, subschema-x, cv, attachement
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Description of the element type with language description.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public LanguageString Description { get; set; }

        /// <summary>
        /// List of allowed content types (Mime types).
        /// If null or empty all content types are allowed.
        /// </summary>
        [JsonProperty(PropertyName = "allowedContentTypes")]
        public List<string> AllowedContentTypes { get; set; }

        /// <summary>
        /// If the data element require application logic this field has value. Otherwise data will be streamed directly to storage.
        /// </summary>
        [JsonProperty(PropertyName = "appLogic")]
        public ApplicationLogic AppLogic { get; set; }

        /// <summary>
        /// A reference to the process element id of the task where this data element should be updated.
        /// </summary>
        [JsonProperty(PropertyName = "taskId")]
        public string TaskId { get; set; }

        /// <summary>
        /// Maximum allowed size of the file in mega bytes. If missing there is no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        public int? MaxSize { get; set; }

        /// <summary>
        /// Maximum number of allowed elements of this type on the same application instance. Default is 1.
        /// </summary>
        /// <remarks>
        /// Zero or below indicate unbounded maximum number of elements.
        /// </remarks>
        [JsonProperty(PropertyName = "maxCount")]
        [DefaultValue(1)]
        public int MaxCount { get; set; }

        /// <summary>
        /// Minimum number of required elements of this type on the same application instance. Default is 1.
        /// </summary>
        /// <remarks>
        /// Zero or below indicate that the element type is optional.
        /// </remarks>
        [JsonProperty(PropertyName = "minCount")]
        [DefaultValue(1)]
        public int MinCount { get; set; }

    }
}
