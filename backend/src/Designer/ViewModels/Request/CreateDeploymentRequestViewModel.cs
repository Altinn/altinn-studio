using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

using Altinn.Studio.Designer.Services.Models;

using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for creating a deployment
    /// </summary>
    public class CreateDeploymentRequestViewModel : IValidatableObject
    {
        /// <summary>
        /// TagName
        /// </summary>
        [Required]
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// Environment
        /// </summary>
        [Required]
        [JsonProperty("env")]
        public EnvironmentModel Environment { get; set; }

        /// <summary>
        /// Determines if this instance of the model is valid.
        /// </summary>
        /// <param name="validationContext">The current context of the validation check</param>
        /// <returns>A list of validation results.</returns>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            List<ValidationResult> issues = new List<ValidationResult>();

            if (string.IsNullOrEmpty(TagName))
            {
                issues.Add(new ValidationResult($"Tag name cannot be empty", new[] { nameof(TagName) }));
                return issues;
            }

            if (TagName[0] == '.' || TagName[0] == '-')
            {
                issues.Add(new ValidationResult($"Tag name cannot start with '.' or '-'.", new[] { nameof(TagName) }));
            }

            if (TagName.Length > 128)
            {
                issues.Add(new ValidationResult($"Tag name cannot be longer than 128 characters.", new[] { nameof(TagName) }));
            }

            if (!Regex.IsMatch(TagName, "^[a-z0-9.-]*$"))
            {
                issues.Add(new ValidationResult($"Tag name cannot have characters outside the following ranges [a-z0-9.-].", new[] { nameof(TagName) }));
            }

            return issues;
        }
    }
}
