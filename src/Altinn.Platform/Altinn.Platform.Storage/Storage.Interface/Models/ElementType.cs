using System;
using System.Collections.Generic;
using System.ComponentModel;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for application element type.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ElementType
    {
        /// <summary>
        /// The element type id. It must be unique within the scope of an application.
        /// Logical name of the schema of which data elements should be validated against.
        /// Should be in lower case and can only contain letters, dash and numbers. No space or slashes are allowed.
        /// Examples are: main, subschema-x, cv, attachement
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// The element type. Only used for form data and represents the class name for the form. 
        /// Formated as {org}.{app}.model.{id}. 
        /// </summary>
        [JsonProperty(PropertyName = "type")]
        public string Type { get; set; }

        /// <summary>
        /// Description of the element type with language description.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public LanguageString Description { get; set; }

        /// <summary>
        /// List of allowed content types (Mime types).
        /// If null or empty all content types are allowed.
        /// </summary>
        [JsonProperty(PropertyName = "allowedContentType")]
        public List<string> AllowedContentType { get; set; }

        /// <summary>
        /// Does the data element require application logic or should it be streamed directly to storage.
        /// </summary>
        [JsonProperty(PropertyName = "appLogic")]
        public bool AppLogic { get; set; }

        /// <summary>
        /// A reference to the process element id of the task where this data element should be updated.
        /// </summary>
        [JsonProperty(PropertyName = "task")]
        public string Task { get; set; }

        /// <summary>
        /// Maximum allowed size of the file in bytes. If missing there is no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        public int? MaxSize { get; set; }

        /// <summary>
        /// Maximum number of instances of same element. Default is 1.
        /// If negative no limit on number of data elements.
        /// </summary>
        [JsonProperty(PropertyName = "maxCount")]
        [DefaultValue(1)]
        public int MaxCount { get; set; }

        /// <summary>
        /// Minimum number of instances of same element. Default is 1.
        /// If negative no limit on number of data elements.
        /// </summary>
        [JsonProperty(PropertyName = "minCount")]
        [DefaultValue(-1)]
        public int MinCount { get; set; }

        /// <summary>
        /// True if signature is required. Default value is false.
        /// </summary>
        [JsonProperty(PropertyName = "shouldSign")]
        [DefaultValue(false)]
        public bool ShouldSign { get; set; }

        /// <summary>
        /// Encryption required by application. Default value is false.  
        /// </summary>
        [JsonProperty(PropertyName = "shouldEncrypt")]
        [DefaultValue(false)]
        public bool ShouldEncrypt { get; set; }
    }
}
