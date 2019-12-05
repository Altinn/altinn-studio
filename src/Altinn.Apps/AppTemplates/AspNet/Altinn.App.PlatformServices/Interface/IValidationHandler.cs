using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.App.Services.Interface
{
    public interface IValidationHandler
    {
        void Validate(ICollection<ValidationResult> validationResults);
    }
}
