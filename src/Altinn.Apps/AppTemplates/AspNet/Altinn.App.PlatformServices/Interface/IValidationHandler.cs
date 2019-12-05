using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.App.Services.Interface
{
    public interface IValidationHandler
    {
        void Validate(object instance, Type modelType, ICollection<ValidationResult> validationResults);
    }
}
