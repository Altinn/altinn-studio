using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for application information
    /// </summary>
    [Serializable]
    public class ApplicationInformation
    {
        /// <summary>
        /// unique id
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// id of the application, e.g. KNS/sailor
        /// </summary>
        [JsonProperty(PropertyName = "applicationId")]
        public string ApplicationId { get; set; }

        /// <summary>
        /// service owner code for the service, e.g. NAV
        /// </summary>
        [JsonProperty(PropertyName = "applicationOwnerId")]
        public string ApplicationOwnerId { get; set; }

        /// <summary>
        /// create date and time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who created the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who last changed the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        /// <summary>
        /// title of the application
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public string Title { get; set; }

        /// <summary>
        /// valid from
        /// </summary>
        [JsonProperty(PropertyName = "validFrom")]
        public DateTime ValidFrom { get; set; }

        /// <summary>
        /// valid from
        /// </summary>
        [JsonProperty(PropertyName = "validTo")]
        public DateTime ValidTo { get; set; }

        /// <summary>
        /// name workflow
        /// </summary>
        [JsonProperty(PropertyName = "WorkflowId")]
        public string WorkflowId { get; set; }
        
        /// <summary>
        /// Gets or sets the forms/models/data elements associated with the application
        /// </summary>
        [JsonProperty(PropertyName = "forms")]
        public Dictionary<string, FormDefinition> Forms { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
