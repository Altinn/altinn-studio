#nullable disable
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

public class NotNullableAttribute : ValidationAttribute
{
    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        if (value == null)
        {
            return new ValidationResult("The field is required.");
        }
        return ValidationResult.Success;
    }
}
