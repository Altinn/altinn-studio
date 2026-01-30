using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Model describing a complete resource from the resource registry
    /// </summary>
    public class ServiceResource
    {
        /// <summary>
        /// The identifier of the resource
        /// </summary>
        public string? Identifier { get; set; }

        /// <summary>
        /// The version of the resource
        /// </summary>
        public string? Version { get; set; }

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
        /// spatial coverage
        /// This property represents that area(s) a Public Service is likely to be available only within, typically the area(s) covered by a particular public authority.
        /// </summary>
        public List<string>? Spatial { get; set; }

        /// <summary>
        /// List of possible contact points
        /// </summary>
        public List<ContactPoint>? ContactPoints { get; set; }

        /// <summary>
        /// Linkes to the outcome of a public service
        /// </summary>
        public List<string>? Produces { get; set; }

        /// <summary>
        /// IsPartOf
        /// </summary>
        public string? IsPartOf { get; set; }

        /// <summary>
        /// ThematicArea
        /// </summary>
        public string? ThematicArea { get; set; }

        /// <summary>
        /// ResourceReference
        /// </summary>
        public List<ResourceReference>? ResourceReferences { get; set; }

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
        /// Sets the access list mode for the resource
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ResourceAccessListMode AccessListMode { get; set; }

        /// <summary>
        /// The user acting on behalf of party can be a selfidentifed users
        /// </summary>
        public bool SelfIdentifiedUserEnabled { get; set; }

        /// <summary>
        /// The user acting on behalf of party can be an enterprise users
        /// </summary>
        public bool EnterpriseUserEnabled { get; set; }

        /// <summary>
        /// ResourceType
        /// </summary>
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public ResourceType? ResourceType { get; set; }

        /// <summary>
        /// Available for type defines which type of entity / person that resource targets
        /// </summary>
        public List<ResourcePartyType>? AvailableForType { get; set; }

        /// <summary>
        /// Consent template defines which template to use if resource is a consent resource
        /// </summary>
        public string? ConsentTemplate { get; set; }

        /// <summary>
        /// Consent text is markdown text used if resource is a consent resource
        /// </summary>
        public Dictionary<string, string>? ConsentText { get; set; }

        /// <summary>
        /// Defines consentmetadata for consent resources
        /// </summary>
        public Dictionary<string, ConsentMetadata>? ConsentMetadata { get; set; }

        /// <summary>
        /// If consent resource is used for one time consents, or consents with an expiry date
        /// </summary>
        public bool IsOneTimeConsent { get; set; }

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
