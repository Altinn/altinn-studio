using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    /// <summary>
    /// Options for search
    /// </summary>
    public class SearchOptions
    {
        /// <summary>
        /// Keyword
        /// </summary>
        [JsonProperty("keyword")]
        public string Keyword { get; set; }

        /// <summary>
        /// UserId (can be an org)
        /// </summary>
        [JsonProperty("uid")]
        public int UId { get; set; }

        /// <summary>
        /// Sort repos by attribute.
        /// Supported values are "alpha", "created", "updated", "size", and "id". Default is "alpha"
        /// </summary>
        [JsonProperty("sort")]
        public string SortBy { get; set; }

        /// <summary>
        /// Sort order, either "asc" (ascending) or "desc" (descending). Default is "asc", ignored if "sort" is not specified.
        /// </summary>
        [JsonProperty("order")]
        public string Order { get; set; }

        /// <summary>
        /// Page number of results to return (1-based)
        /// </summary>
        [JsonProperty("page")]
        public int Page { get; set; }

        /// <summary>
        /// Page size of results
        /// </summary>
        [JsonProperty("limit")]
        public int Limit { get; set; }
    }
}
