using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// The JSON container class
    /// </summary>
    public class RootObject
    {
        /// <summary>
        /// Gets or sets the Root object for the JSON model
        /// </summary>
        [JsonProperty("urlresources")]
        public UrlResources UrlResources { get; set; }
    }

    /// <summary>
    /// Dictionary of the data source model
    /// </summary>
    public class UrlResources
    {
        /// <summary>
        /// Gets or sets the model into a dictionary
        /// </summary>
        [JsonProperty("datasourceurls")]
        public Dictionary<string, DataSourceModel> DataSourceUrls { get; set; }
    }

    /// <summary>
    /// Container class for the DataSource
    /// </summary>
    public class DataSourceModel
    {
        /// <summary>
        /// Gets or sets Id for the class
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the URL to the external REST API
        /// </summary>
        [JsonProperty("jsonurl")]
        public string Url { get; set; }

        /// <summary>
        /// Gets or sets description of the service
        /// </summary>
        [JsonProperty("description")]
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets when the service was added
        /// </summary>
        [JsonProperty("opprettet")]
        public DateTime Opprettet { get; set; }
    }
}