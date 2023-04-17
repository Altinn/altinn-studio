#nullable enable
using System.Collections.Generic;
using System;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model describing a complete resource from the resrouce registry
    /// </summary>
    public class ServiceResource
    {
        /// <summary>
        /// The identifier of the resource
        /// </summary>
        public string? Identifier { get; set; }

        /// <summary>
        /// The title of service
        /// </summary>
        public Dictionary<string, string>? Title { get; set; }

        /// <summary>
        /// Description
        /// </summary>
        public Dictionary<string, string>? Description { get; set; }

        /// <summary>
        /// Description explaining the rights a recipient will receive if given access to the resource
        /// </summary>
        public Dictionary<string, string>? RightDescription { get; set; }

        /// <summary>
        /// The homepage
        /// </summary>
        public string? Homepage { get; set; }

        /// <summary>
        /// The status
        /// </summary>
        public string? Status { get; set; }

        /// <summary>
        /// When the resource is available from
        /// </summary>
        public DateTime? ValidFrom { get; set; }

        /// <summary>
        /// When the resource is available to
        /// </summary>
        public DateTime? ValidTo { get; set; }

        /// <summary>
        /// IsPartOf
        /// </summary>
        public string? IsPartOf { get; set; }

        /// <summary>
        /// IsPublicService
        /// </summary>
        public bool? IsPublicService { get; set; }

        /// <summary>
        /// ThematicArea
        /// </summary>
        public string? ThematicArea { get; set; }

        /// <summary>
        /// ResourceReference
        /// </summary>
        public List<ResourceReference>? ResourceReferences { get; set; }

        /// <summary>
        /// IsComplete
        /// </summary>
        public bool? IsComplete { get; set; }

        /// <summary>
        /// Is this resource possible to delegate to others or not
        /// </summary>
        public bool? Delegable { get; set; } = true;

        /// <summary>
        /// The visibility of the resource
        /// </summary>
        public bool? Visible { get; set; } = true;

        /// <summary>
        /// HasCompetentAuthority
        /// </summary>
        public CompetentAuthority? HasCompetentAuthority { get; set; }

        /// <summary>
        /// Keywords
        /// </summary>
        public List<Keyword>? Keywords { get; set; }

        /// <summary>
        /// Sector
        /// </summary>
        public List<string>? Sector { get; set; }

        /// <summary>
        /// ResourceType
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ResourceType ResourceType { get; set; }

        /// <summary>
        /// The fallback language of the resource
        /// </summary>
        public string? MainLanguage { get; set; } = "nb";

        /// <summary>
        /// Writes key information when this object is written to Log.
        /// </summary>
        /// <returns></returns>
        public override string ToString()
        {
            return $"Identifier: {Identifier}, ResourceType: {ResourceType}";
        }
    }
}
