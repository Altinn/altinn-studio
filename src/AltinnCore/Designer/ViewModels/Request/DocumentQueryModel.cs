using System.ComponentModel.DataAnnotations;
using AltinnCore.Designer.ViewModels.Request.Enums;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Model used for querying DocumentDb
    /// </summary>
    public class DocumentQueryModel
    {
        /// <summary>
        /// Number of documents to find
        /// </summary>
        [FromQuery(Name = "top")]
        public int? Top { get; set; }

        /// <summary>
        /// The property to order by
        /// Properties: created
        /// </summary>
        [FromQuery(Name = "sortBy")]
        public string SortBy { get; set; }

        /// <summary>
        /// The sort direction
        /// Ascending | Descending
        /// </summary>
        [FromQuery(Name = "sortDirection")]
        [EnumDataType(typeof(SortDirection))]
        [JsonConverter(typeof(StringEnumConverter))]
        public SortDirection SortDirection { get; set; }

        /// <summary>
        /// Organisation
        /// </summary>
        internal string Org { get; set; }

        /// <summary>
        /// Application
        /// </summary>
        internal string App { get; set; }
    }
}
