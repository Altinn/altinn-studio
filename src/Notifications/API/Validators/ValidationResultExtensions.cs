#nullable enable
using FluentValidation.Results;

using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.Notifications.Validators;

/// <summary>
/// Extension class for <see cref="ValidationResult"/>
/// </summary>
public static class ValidationResultExtensions
{
    /// <summary>
    /// Adds the validation result to the model state
    /// </summary>
    public static void AddToModelState(this ValidationResult result, ModelStateDictionary modelState)
    {
        foreach (var error in result.Errors)
        {
            modelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }
    }
}
