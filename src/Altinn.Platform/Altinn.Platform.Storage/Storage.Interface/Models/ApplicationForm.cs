using System;
using System.Collections.Generic;
using System.ComponentModel;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for application form definition
    /// </summary>
    [Serializable]
    public class ApplicationForm
    {
        /// <summary>
        /// The form id. It must be unique within an application.
        /// Logical name of the schema of which form data should be validated against.
        /// Examples are: main, subform-x, cv, attachement
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Description of the form with language description.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public Dictionary<string, string> Description { get; set; }
        
        /// <summary>
        /// List of allowed content types (Mime types).
        /// If null or empty all content types are allowed.
        /// </summary>
        [JsonProperty(PropertyName = "allowedContentType")]
        public List<string> AllowedContentType { get; set; }

        /// <summary>
        /// Maximum allowed size of the file in bytes. If missing or negative, no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        [DefaultValue(-1)]
        public int MaxSize { get; set; }

        /// <summary>
        /// Maximum number of instances of same form. Default is 1.
        /// If negative no limit on number of data elements.
        /// </summary>
        [JsonProperty(PropertyName = "maxCount")]
        [DefaultValue(1)]
        public int MaxCount { get; set; }

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
