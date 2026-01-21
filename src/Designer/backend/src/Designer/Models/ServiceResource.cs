using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
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
        public ServiceResourceTranslatedString? Title { get; set; }

        /// <summary>
        /// Description
        /// </summary>
        public ServiceResourceTranslatedString? Description { get; set; }

        /// <summary>
        /// Description explaining the rights a recipient will receive if given access to the resource
        /// </summary>
        public ServiceResourceTranslatedString? RightDescription { get; set; }

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

    public class ServiceResourceTranslatedString
    {
        public string? Nb { get; set; }
        public string? En { get; set; }
        public string? Nn { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? OtherLanguages { get; set; }

        public static implicit operator Dictionary<string, string>?(
            ServiceResourceTranslatedString srts
        )
        {
            if (srts == null)
                return null;
            var dict = new Dictionary<string, string>();

            if (srts.Nb != null)
            {
                dict["nb"] = srts.Nb;
            }

            if (srts.En != null)
            {
                dict["en"] = srts.En;
            }

            if (srts.Nn != null)
            {
                dict["nn"] = srts.Nn;
            }

            if (srts.OtherLanguages != null)
            {
                foreach (
                    KeyValuePair<string, JsonElement> kvp in srts.OtherLanguages.Where(kvp =>
                        kvp.Value.ValueKind == JsonValueKind.String
                    )
                )
                {
                    dict[kvp.Key] = kvp.ToString();
                }
            }

            return dict;
        }
    }

    public class AltinnAppServiceResource : ServiceResource, IValidatableObject
    {
        [Required]
        public new string? Identifier { get; set; }

        [Required]
        public new List<ContactPoint>? ContactPoints { get; set; }

        [Required]
        public new ServiceResourceTranslatedString? Title { get; set; }

        [Required]
        public new ServiceResourceTranslatedString? Description { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            const string MissingErrorMessage = "REQUIRED";
            if (Title?.Nb is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Title) + "." + nameof(Title.Nb)]
                );
            }

            if (Title?.Nn is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Title) + "." + nameof(Title.Nn)]
                );
            }

            if (Title?.En is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Title) + "." + nameof(Title.En)]
                );
            }

            if (Description?.Nb is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Description) + "." + nameof(Description.Nb)]
                );
            }

            if (Description?.Nn is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Description) + "." + nameof(Description.Nn)]
                );
            }

            if (Description?.En is null or "")
            {
                yield return new ValidationResult(
                    MissingErrorMessage,
                    [nameof(Description) + "." + nameof(Description.En)]
                );
            }

            if (Delegable == true)
            {
                if (RightDescription is null)
                {
                    yield return new ValidationResult(
                        MissingErrorMessage,
                        [nameof(RightDescription)]
                    );
                }
                else
                {
                    if (RightDescription?.Nb is null or "")
                    {
                        yield return new ValidationResult(
                            MissingErrorMessage,
                            [nameof(RightDescription) + "." + nameof(RightDescription.Nb)]
                        );
                    }

                    if (RightDescription?.Nn is null or "")
                    {
                        yield return new ValidationResult(
                            MissingErrorMessage,
                            [nameof(RightDescription) + "." + nameof(RightDescription.Nn)]
                        );
                    }

                    if (RightDescription?.En is null or "")
                    {
                        yield return new ValidationResult(
                            MissingErrorMessage,
                            [nameof(RightDescription) + "." + nameof(RightDescription.En)]
                        );
                    }
                }
            }

            if (ContactPoints is null || ContactPoints.Count == 0)
            {
                yield return new ValidationResult(MissingErrorMessage, [nameof(ContactPoints)]);
            }
            else
            {
                foreach (
                    ContactPoint? _ in ContactPoints.Where(contactPoint =>
                        contactPoint.Category is null or ""
                        && contactPoint.Email is null or ""
                        && contactPoint.Telephone is null or ""
                        && contactPoint.ContactPage is null or ""
                    )
                )
                {
                    yield return new ValidationResult(MissingErrorMessage, [nameof(ContactPoints)]);
                }
            }
        }
    }
}
