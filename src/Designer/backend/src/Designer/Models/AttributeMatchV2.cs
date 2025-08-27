using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// This model describes a pair of AttributeId and AttributeValue for use in matching in XACML policies, for instance a resource, a user, a party or an action.
    /// </summary>
    public class AttributeMatchV2
    {
        /// <summary>
        /// Gets or sets the attribute id for the match
        /// </summary>
        [Required]
        public required string Type { get; set; }

        /// <summary>
        /// Gets or sets the attribute value for the match
        /// </summary>
        [Required]
        public required string Value { get; set; }

        /// <summary>
        /// The urn for the attribute
        /// </summary>
        [Required]
        public required string Urn { get; set; }
    }
}
