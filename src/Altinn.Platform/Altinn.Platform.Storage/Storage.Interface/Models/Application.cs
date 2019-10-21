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
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Application
    {
        /// <summary>
        /// Unique id of the application, e.g. test/app-34
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// the application build version
        /// </summary>
        [JsonProperty(PropertyName = "versionId")]
        public string VersionId { get; set; }

        /// <summary>
        /// Service owner code for the service, e.g. nav.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// Creation date-time for the instance, first time application is deployed and registered in storage.
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// User id of the user who created (deployed) the application first time.
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// Last changed date-time for the application.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// User id of the user who last redeployed the application.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        /// <summary>
        /// Title of the application with language codes.
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public Dictionary<string, string> Title { get; set; }

        /// <summary>
        /// application is valid from this date-time
        /// </summary>
        [JsonProperty(PropertyName = "validFrom")]
        public DateTime? ValidFrom { get; set; }

        /// <summary>
        /// application is valid to this date-time
        /// </summary>
        [JsonProperty(PropertyName = "validTo")]
        public DateTime? ValidTo { get; set; }

        /// <summary>
        /// Identifier of the workflow that is used by the application
        /// </summary>
        [JsonProperty(PropertyName = "WorkflowId")]
        public string WorkflowId { get; set; }

        /// <summary>
        /// Maximum allowed size of all the data element files of an application instance in bytes.
        /// If not set there is no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        public int? MaxSize { get; set; }

        /// <summary>
        /// Gets or sets the data element types associated with the application
        /// </summary>
        [JsonProperty(PropertyName = "elementTypes")]
        public List<ElementType> ElementTypes { get; set; }

        /// <summary>
        /// Gets of sets the different party types allowed to instantiate the application
        /// </summary>
        [JsonProperty(PropertyName = "partyTypesAllowed")]
        public PartyTypesAllowed PartyTypesAllowed { get; set; }

        /// <summary>
        /// Gets or sets the subscription hook attached to the application
        /// </summary>
        [JsonProperty(PropertyName = "subscriptionHook")]
        public SubscriptionHook SubscriptionHook {get; set;}

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
