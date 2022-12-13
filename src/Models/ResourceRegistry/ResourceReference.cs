using System.Text.Json.Serialization;
using Altinn.ResourceRegistry.Core.Enums;

namespace Altinn.ResourceRegistry.Core.Models
{
    /// <summary>
    /// Model representation of the resource reference part of the ServiceResource model
    /// </summary>
    public class ResourceReference
    {
        /// <summary>
        /// The source the reference identifier points to
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ReferenceSource? ReferenceSource { get; set; }

        /// <summary>
        /// The reference identifier
        /// </summary>
        public string? Reference { get; set; }

        /// <summary>
        /// The reference type
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ReferenceType? ReferenceType { get; set; }
    }
}
