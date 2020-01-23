using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an object with information about how the data type is handled by the application logic.
    /// </summary>
    public class ApplicationLogic
    {
        /// <summary>
        /// Gets or sets a value indicating whether the app-backend will attempt to automatically create (or prefill)
        /// this data type when the task referred by taskId starts.
        /// </summary>
        [JsonProperty(PropertyName = "autoCreate")]
        public bool? AutoCreate;

        /// <summary>
        /// Gets or sets the class type to instantiate when creating an instance of this data type.
        /// </summary>
        [JsonProperty(PropertyName = "classRef")]
        public string ClassRef;

        /// <summary>
        /// Gets or sets the name and path to the data type schema.
        /// </summary>
        [JsonProperty(PropertyName = "schemaRef")]
        public string SchemaRef;
    }
}
