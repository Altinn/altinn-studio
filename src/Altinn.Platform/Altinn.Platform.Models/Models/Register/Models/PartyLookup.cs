using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Register.Models
{
    /// <summary>
    /// Represents a lookup criteria when looking for a Party. Only one of the properties can be used at a time.
    /// If none or more than one property have a value the lookup operation will respond with bad request.
    /// </summary>
    public class PartyLookup : IValidatableObject
    {
        /// <summary>
        /// Gets or sets the social security number of the party to look for.
        /// </summary>
        [JsonPropertyName("ssn")]
        [RegularExpression("^[0-9]{11}$", ErrorMessage = "Value needs to be exactly 11 digits.")]
        public string Ssn { get; set; }

        /// <summary>
        /// Gets or sets the organization number of the party to look for.
        /// </summary>
        [JsonPropertyName("orgNo")]
        [RegularExpression("^[0-9]{9}$", ErrorMessage = "Value needs to be exactly 9 digits.")]
        public string OrgNo { get; set; }

        /// <summary>
        /// Determines if this instance of the model is valid.
        /// </summary>
        /// <param name="validationContext">The current context of the validation check</param>
        /// <returns>A list of validation results.</returns>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            List<ValidationResult> issues = new List<ValidationResult>();

            if (Ssn != null)
            {
                if (OrgNo != null)
                {
                    issues.Add(new ValidationResult($"With Ssn already provided the OrgNo field should be null.", new string[] { nameof(OrgNo) } ));
                }
            }
            else if (OrgNo == null)
            {
                issues.Add(new ValidationResult($"At least one of the object properties must have a value", new string[] { nameof(Ssn), nameof(OrgNo) } ));
            }

            return issues;
        }
    }
}
