using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactMethodRequest : IValidatableObject
{
    public required ContactMethodType MethodType { get; set; }

    [MaxLength(255)]
    public required string Value { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MethodType == ContactMethodType.Sms && !PhoneNumber.TryNormalize(Value, out _))
        {
            yield return new ValidationResult(
                "Phone number must include a country code, such as +4712345678.",
                [nameof(Value)]
            );
        }
    }
}
