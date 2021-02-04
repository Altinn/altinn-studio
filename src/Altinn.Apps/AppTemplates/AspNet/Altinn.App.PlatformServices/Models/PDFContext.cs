using System.Collections.Generic;
using Altinn.App.Common.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using Newtonsoft.Json;

namespace Altinn.App.Services.Models
{
    /// <summary>
    /// Represents a collection of all data required to generate a PDF
    /// </summary>
    public class PDFContext
    {
        /// <summary>
        /// Gets or sets the instance
        /// </summary>
        [JsonProperty(PropertyName = "instance")]
        public Instance Instance { get; set; }

        /// <summary>
        /// Gets or sets the form layouts
        /// </summary>
        [JsonProperty(PropertyName = "formLayouts")]
        public Dictionary<string, object> FormLayouts { get; set; }

        /// <summary>
        /// Gets or sets the layout settings
        /// </summary>
        [JsonProperty(PropertyName = "layoutSettings")]
        public LayoutSettings LayoutSettings { get; set; } 

        /// <summary>
        /// Gets or sets the text resources
        /// </summary>
        [JsonProperty(PropertyName = "textResources")]
        public object TextResources { get; set; }

        /// <summary>
        /// Gets or sets the dictionary of options.
        /// </summary>
        [JsonProperty(PropertyName = "optionsDictionary")]
        public Dictionary<string, Dictionary<string, string>> OptionsDictionary { get; set; }

        /// <summary>
        /// Gets or sets the data, note that this should be base64 encoded
        /// </summary>
        [JsonProperty(PropertyName = "data")]
        public string Data { get; set; }

        /// <summary>
        /// Gets or sets the user party
        /// </summary>
        [JsonProperty(PropertyName = "userParty")]
        public Party UserParty { get; set; }

        /// <summary>
        /// Gets or sets the party
        /// </summary>
        [JsonProperty(PropertyName = "party")]
        public Party Party { get; set; }

        /// <summary>
        /// Gets or sets the user profile
        /// </summary>
        [JsonProperty(PropertyName = "userProfile")]
        public UserProfile UserProfile { get; set; }
    }
}
