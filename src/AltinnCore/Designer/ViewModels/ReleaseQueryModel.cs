using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels
{
    /// <summary>
    /// Query model for releases
    /// </summary>
    public class ReleaseQueryModel
    {
        /// <summary>
        /// Optional, number of elements
        /// </summary>
        [FromQuery(Name = "top")]
        public int? Top { get; set; }

        /// <summary>
        /// Sort by properties on a release
        /// Properties: created
        /// </summary>
        [FromQuery(Name = "sort")]
        public string Sort { get; set; }
    }
}
