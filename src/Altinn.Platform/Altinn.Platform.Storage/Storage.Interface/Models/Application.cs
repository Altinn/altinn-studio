using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an application by providing information about it.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Application : ChangableElement
    {
        /// <summary>
        /// Gets or sets the unique id of the application, e.g. test/app-34
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the application version id.
        /// </summary>
        [JsonProperty(PropertyName = "versionId")]
        public string VersionId { get; set; }

        /// <summary>
        /// Gets or sets the short code representing the owner of the service. E.g. nav
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the title of the application with language codes.
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public Dictionary<string, string> Title { get; set; }

        /// <summary>
        /// Gets or sets the date and time from when the application is valid/can be used.
        /// </summary>
        [JsonProperty(PropertyName = "validFrom")]
        public DateTime? ValidFrom { get; set; }

        /// <summary>
        /// Gets or sets the date and time at when the application is no longer valid/can no longer be used.
        /// </summary>
        [JsonProperty(PropertyName = "validTo")]
        public DateTime? ValidTo { get; set; }

        /// <summary>
        /// Gets or sets an identifier of the process model that is used by the application.
        /// </summary>
        [JsonProperty(PropertyName = "processId")]
        public string ProcessId { get; set; }

        /// <summary>
        /// Gets or sets a list of data types that are allowed on an instance of this application.
        /// </summary>
        [JsonProperty(PropertyName = "dataTypes")]
        public List<DataType> DataTypes { get; set; }

        /// <summary>
        /// Gets or sets the different party types that are allowed to be owners of instances based on this application.
        /// </summary>
        [JsonProperty(PropertyName = "partyTypesAllowed")]
        public PartyTypesAllowed PartyTypesAllowed { get; set; }

        /// <summary>
        /// Gets or sets a property indicating if application instance should be automatically marked for hard deletion on process end.
        /// </summary>
        [JsonProperty(PropertyName = "autoDeleteOnProcessEnd")]
        public bool AutoDeleteOnProcessEnd { get; set; }

        /// <summary>
        /// Gets or sets the presentation fields of the application.
        /// </summary>
        [JsonProperty(PropertyName = "presentationFields")]
        public List<DataField> PresentationFields { get; set; }

        /// <summary>
        /// Gets or sets the data fields of the application.
        /// The data for fields specified here will automatically be copied and populated on the <see cref="Instance"/> model as data values,
        /// making them easily available for routing or other needs without having to load the entire data set.
        /// </summary>
        [JsonProperty(PropertyName = "dataFields")]
        public List<DataField> DataFields { get; set; }

        /// <summary>
        /// Gets or sets the definition of eFormidling shipments related to the app.
        /// </summary>
        [JsonProperty(PropertyName = "eFormidling")]
        public EFormidlingContract EFormidling { get; set; }

        /// <summary>
        /// Gets or sets the "on entry" configuration of the app.
        /// </summary>
        [JsonProperty(PropertyName = "onEntry")]
        public OnEntryConfig OnEntry { get; set; }

        /// <summary>
        /// Gets or sets the messagebox configuration of the app.
        /// </summary>
        [JsonProperty(PropertyName = "messageBoxConfig")]
        public MessageBoxConfig MessageBoxConfig { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    /// <summary>
    /// Represents a container object with a list of applications.
    /// </summary>
    /// <remarks>
    /// This should be used only when an API endpoint would otherwise return a list of applications.
    /// Not when a list is a property of a separate class.
    /// </remarks>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationList
    {
        /// <summary>
        /// The actual list of applications.
        /// </summary>
        [JsonProperty(PropertyName = "applications")]
        public List<Application> Applications { get; set; }
    }
}
