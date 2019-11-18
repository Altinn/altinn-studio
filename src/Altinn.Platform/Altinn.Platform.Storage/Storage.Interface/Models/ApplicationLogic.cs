using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    public class ApplicationLogic
    {
        /// <summary>
        /// If true the app-backend will attemt to automatically create (or prefill) this data element when the task referred by taskId starts.
        /// </summary>
        [JsonProperty(PropertyName = "autoCreate")]
        public bool? AutoCreate;

        /// <summary>
        /// Reference to the class that is started to instantiate the data type.
        /// </summary>
        [JsonProperty(PropertyName = "classRef")]
        public string ClassRef;

        /// <summary>
        /// Reference to the schema that defines the data type.
        /// </summary>
        [JsonProperty(PropertyName = "schemaRef")]
        public string SchemaRef;
    }
}
