using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ModelMetadatalModels
{
    /// <summary>
    /// Class representing a service element restriction
    /// </summary>
    public class Restriction
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Restriction"/> class
        /// </summary>
        public Restriction()
        {
        }

        /// <summary>
        /// Gets or sets base value type
        /// </summary>
        [JsonProperty(PropertyName = "value")]
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets error texts
        /// </summary>
        [JsonProperty(PropertyName = "errortText")]
        public string ErrortText { get; set; }
    }
}
