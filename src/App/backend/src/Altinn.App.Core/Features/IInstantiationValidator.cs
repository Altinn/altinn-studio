using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// IInstantiationValidator defines the methods that must be implemented by a class that handles custom validation logic during instantiation of a new instance.
/// </summary>
[ImplementableByApps]
public interface IInstantiationValidator
{
    /// <summary>
    /// Run validations related to instantiation
    /// </summary>
    /// <example>
    /// if ([some condition])
    /// {
    ///     return new ValidationResult("[error message]");
    /// }
    /// return null;
    /// </example>
    /// <param name="instance">The instance being validated</param>
    /// <returns>The validation result object (null if no errors) </returns>
    public Task<InstantiationValidationResult?> Validate(Instance instance);
}
