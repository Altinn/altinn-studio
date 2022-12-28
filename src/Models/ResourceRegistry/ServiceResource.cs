using Altinn.ResourceRegistry.Core.Enums;
using Altinn.ResourceRegistry.Core.Models;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.ResourceRegistry.Models
{
    /// <summary>
    /// Model describing a complete resource from the resrouce registry
    /// </summary>
    public class ServiceResource
    {
        /// <summary>
        /// The identifier of the resource
        /// </summary>
        public string Identifier { get; set; }

        /// <summary>
        /// The title of service
        /// </summary>
        public Dictionary<string, string> Title { get; set; }

        /// <summary>
        /// Description
        /// </summary>
        public Dictionary<string, string> Description { get; set; }

        /// <summary>
        /// Description explaining the rights a recipient will receive if given access to the resource
        /// </summary>
        public Dictionary<string, string> RightDescription { get; set;  }

        /// <summary>
        /// The homepage
        /// </summary>
        public string Homepage { get; set; }    

        /// <summary>
        /// The status
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// When the resource is available from
        /// </summary>
        public DateTime ValidFrom { get; set; } 

        /// <summary>
        /// When the resource is available to
        /// </summary>
        public DateTime ValidTo { get; set; }

        /// <summary>
        /// IsPartOf
        /// </summary>
        public string IsPartOf { get; set; }

        /// <summary>
        /// IsPublicService
        /// </summary>
        public bool IsPublicService { get; set; }

        /// <summary>
        /// ThematicArea
        /// </summary>
        public string? ThematicArea { get; set; }

        /// <summary>
        /// ResourceReference
        /// </summary>
        public List<ResourceReference> ResourceReferences { get; set; }

        /// <summary>
        /// IsComplete
        /// </summary>
        public bool? IsComplete { get; set; }

        /// <summary>
        /// HasCompetentAuthority
        /// </summary>
        public CompetentAuthority HasCompetentAuthority { get; set; }

        /// <summary>
        /// Keywords
        /// </summary>
        public List<Keyword> Keywords { get; set; }

        /// <summary>
        /// Sector
        /// </summary>
        public List<string> Sector { get; set; }

        /// <summary>
        /// ResourceType
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ResourceType ResourceType { get; set; }
    }
}
