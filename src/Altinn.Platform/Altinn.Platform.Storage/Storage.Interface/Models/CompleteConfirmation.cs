using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents information about when a given stakeholder informed Altinn that they consider their own process as complete
    /// in regards to the instance. A typical stakeholder is the application owner. 
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class CompleteConfirmation
    {
        /// <summary>
        /// Gets or sets a unique identifier for a stakeholder.
        /// </summary>
        [JsonProperty(PropertyName = "stakeholderId")]
        public string StakeholderId { get; set; }

        /// <summary>
        /// Gets or sets the date and time for when the complete confirmation was created.
        /// </summary>
        [JsonProperty(PropertyName = "confirmedOn")]
        public DateTime ConfirmedOn { get; set; }
    }
}
