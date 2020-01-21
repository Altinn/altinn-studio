using System.Collections.Generic;
using System.ComponentModel;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents metadata about a type of data element that the application will require when stepping through the process of
    /// an application while completing an instance.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class DataType
    {
        /// <summary>
        /// Gets or sets the data type id.
        /// It must be unique within the scope of an application. Logical name of the schema of which data elements should be validated against.
        /// Should be in lower case and can only contain letters, dash and numbers. No space or slashes are allowed.
        /// Examples are: main, subschema-x, cv, attachement
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets a description of the data type with language description.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public LanguageString Description { get; set; }

        /// <summary>
        /// Gets or sets a list of allowed content types (Mime types). If null or empty all content types are allowed.
        /// </summary>
        [JsonProperty(PropertyName = "allowedContentTypes")]
        public List<string> AllowedContentTypes { get; set; }

        /// <summary>
        /// Gets or sets an object with information about how the application logic will handle the data element.
        /// </summary>
        [JsonProperty(PropertyName = "appLogic")]
        public ApplicationLogic AppLogic { get; set; }

        /// <summary>
        /// Gets or sets a reference to the process element id of the task where this data element should be updated.
        /// </summary>
        [JsonProperty(PropertyName = "taskId")]
        public string TaskId { get; set; }

        /// <summary>
        /// Gets or sets the maximum allowed size of the file in mega bytes. If missing there is no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        public int? MaxSize { get; set; }

        /// <summary>
        /// Gets or sets the maximum number of allowed elements of this type on the same application instance. Default is 1.
        /// </summary>
        /// <remarks>
        /// Zero or below indicate unbounded maximum number of elements.
        /// </remarks>
        [JsonProperty(PropertyName = "maxCount")]
        [DefaultValue(1)]
        public int MaxCount { get; set; }

        /// <summary>
        /// Gets or sets the minimum number of required elements of this type on the same application instance. Default is 1.
        /// </summary>
        /// <remarks>
        /// Zero or below indicate that the element type is optional.
        /// </remarks>
        [JsonProperty(PropertyName = "minCount")]
        [DefaultValue(1)]
        public int MinCount { get; set; }
    }
}
