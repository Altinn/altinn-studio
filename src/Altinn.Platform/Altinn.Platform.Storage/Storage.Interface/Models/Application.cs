using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model for application metadata.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Application : ChangableElement
    {
        /// <summary>
        /// Unique id of the application, e.g. test/app-34
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// the application version id.
        /// </summary>
        [JsonProperty(PropertyName = "versionId")]
        public string VersionId { get; set; }

        /// <summary>
        /// Service owner code for the service, e.g. nav.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

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
        /// Identifier of the prosess model that is used by the application.
        /// </summary>
        [JsonProperty(PropertyName = "processId")]
        public string ProcessId { get; set; }

        /// <summary>
        /// Maximum allowed size of all the data element files of an application instance in bytes.
        /// If not set there is no limit on file size.
        /// </summary>
        [JsonProperty(PropertyName = "maxSize")]
        public int? MaxSize { get; set; }

        /// <summary>
        /// Gets or sets the data types, the allowed elements of an application instance.
        /// </summary>
        [JsonProperty(PropertyName = "dataTypes")]
        public List<DataType> DataTypes { get; set; }

        /// <summary>
        /// Gets of sets the different party types allowed to instantiate the application
        /// </summary>
        [JsonProperty(PropertyName = "partyTypesAllowed")]
        public PartyTypesAllowed PartyTypesAllowed { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
