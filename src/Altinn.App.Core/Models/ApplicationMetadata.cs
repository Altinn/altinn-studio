using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Extension of Application model from Storage. Adds app specific attributes to the model
    /// </summary>
    public class ApplicationMetadata : Application
    {
        /// <summary>
        /// Create new instance of ApplicationMetadata
        /// </summary>
        /// <param name="id"></param>
        public ApplicationMetadata(string id)
        {
            base.Id = id;
            AppIdentifier = new AppIdentifier(id);
        }

        /// <summary>
        /// Override Id from base to ensure AppIdentifier is set
        /// </summary>
        public new string Id
        {
            get { return base.Id; }
            set
            {
                AppIdentifier = new AppIdentifier(value);
                base.Id = value;
            }
        }


        /// <summary>
        /// List of features and status (enabled/disabled)
        /// </summary>
        [JsonProperty(PropertyName = "features")]
        public Dictionary<string, bool>? Features { get; set; }

        /// <summary>
        /// Get AppIdentifier based on ApplicationMetadata.Id
        /// Updated by setting ApplicationMetadata.Id
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public AppIdentifier AppIdentifier { get; private set; }
    }
}
