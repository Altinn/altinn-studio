#nullable enable
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models
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
        public ResourceReferenceSource? ReferenceSource { get; set; }

        /// <summary>
        /// The reference identifier
        /// </summary>
        public string? Reference { get; set; }

        /// <summary>
        /// The reference type
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ResourceReferenceType? ReferenceType { get; set; }
    }
}
