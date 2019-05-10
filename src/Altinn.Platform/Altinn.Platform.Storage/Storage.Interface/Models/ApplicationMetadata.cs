using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for application metadata.
    /// </summary>
    [Serializable]
    public class ApplicationMetadata
    {
        /// <summary>
        /// Unique id of the application, e.g. TEST-sailor.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// the application build version 
        /// </summary>
        [JsonProperty(PropertyName = "versionId")]
        public string VersionId { get; set; }

        /// <summary>
        /// Service owner code for the service, e.g. NAV.
        /// </summary>
        [JsonProperty(PropertyName = "applicationOwnerId")]
        public string ApplicationOwnerId { get; set; }

        /// <summary>
        /// Creation date and time for the instance, first time application is deployed and registered in storage.
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// User id of the user who deployed.
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// Last changed date time for the application.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// User id of the user who last redeployed the application
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        /// <summary>
        /// Title of the application with language codes. 
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public Dictionary<string, string> Title { get; set; }

        /// <summary>
        /// valid from
        /// </summary>
        [JsonProperty(PropertyName = "validFrom")]
        public DateTime? ValidFrom { get; set; }

        /// <summary>
        /// valid to
        /// </summary>
        [JsonProperty(PropertyName = "validTo")]
        public DateTime? ValidTo { get; set; }

        /// <summary>
        /// name workflow
        /// </summary>
        [JsonProperty(PropertyName = "WorkflowId")]
        public string WorkflowId { get; set; }

        /// <summary>
        /// Maximum allowed size of all the data element files of an application instance in bytes.
        /// If negative no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        [DefaultValue(-1)]
        public int MaxSize { get; set; }

        /// <summary>
        /// Gets or sets the forms data elements associated with the application
        /// </summary>
        [JsonProperty(PropertyName = "forms")]
        public List<ApplicationForm> Forms { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
