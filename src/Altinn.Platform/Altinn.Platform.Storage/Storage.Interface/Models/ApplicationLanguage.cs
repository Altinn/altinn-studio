using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents the supported language in the text resource folder.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationLanguage
    {
        /// <summary>
        /// Gets or sets the language code. Should be a two letter ISO name
        /// </summary>
        [JsonProperty(PropertyName = "languageCode")]
        public string LanguageCode { get; set; }

        /// <summary>
        /// Gets or sets the language
        /// </summary>
        [JsonProperty(PropertyName = "language")]
        public string Language { get; set; }

        /// <summary>
        /// Gets or sets the label of the dropdown menu
        /// </summary>
        [JsonProperty(PropertyName = "dropdownLabel")]
        public string DropdownLabel { get; set; }
    }
}
