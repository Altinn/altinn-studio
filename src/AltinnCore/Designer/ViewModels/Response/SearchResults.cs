using System.Collections.Generic;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Response
{
    /// <summary>
    /// ViewModel for response when returning search results
    /// </summary>
    public class SearchResults<T>
        where T : class
    {
        /// <summary>
        /// Results from the search
        /// </summary>
        [JsonProperty("results")]
        [XmlIgnore]
        public IEnumerable<T> Results { get; set; }
    }
}
