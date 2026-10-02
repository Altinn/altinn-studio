#nullable disable
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request;

/// <summary>
/// Viewmodel for creating a deployment
/// </summary>
public class CreateDeploymentRequestViewModel : IValidatableObject
{
    /// <summary>
    /// Environment Name
    /// </summary>
    [Required]
    [JsonProperty("envName")]
    public string EnvName { get; set; }

    /// <summary>
    /// TagName
    /// </summary>
    [Required]
    [JsonProperty("tagName")]
    public string TagName { get; set; }

    /// <summary>
    /// App status to register for the deployed app. When omitted, the default for the environment is used.
    /// </summary>
    [JsonProperty("appStatus")]
    public AppStatus? AppStatus { get; set; }

    /// <summary>
    /// Determines if this instance of the model is valid.
    /// </summary>
    /// <param name="validationContext">The current context of the validation check</param>
    /// <returns>A list of validation results.</returns>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        List<ValidationResult> issues = new List<ValidationResult>();

        if (AppStatus is not (null or Models.AppStatus.UnderDevelopment or Models.AppStatus.Completed))
        {
            issues.Add(
                new ValidationResult(
                    $"App status must be {Models.AppStatus.UnderDevelopment} or {Models.AppStatus.Completed}.",
                    new[] { nameof(AppStatus) }
                )
            );
        }

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
            issues.Add(
                new ValidationResult($"Tag name cannot be longer than 128 characters.", new[] { nameof(TagName) })
            );
        }

        if (!Regex.IsMatch(TagName, "^[a-z0-9.-]*$"))
        {
            issues.Add(
                new ValidationResult(
                    $"Tag name cannot have characters outside the following ranges [a-z0-9.-].",
                    new[] { nameof(TagName) }
                )
            );
        }

        return issues;
    }
}
