using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features;

/// <summary>
/// ICopyInstanceValidator is designed to handle specific validation scenarios that is just relevant while copying an instance
/// </summary>
[ImplementableByApps]
public interface ICopyInstanceValidator
{
    /// <summary>
    /// Run validations related to copying an instance
    /// </summary>
    /// <example>
    /// if ([some condition])
    /// {
    ///   return new InstantiationValidationResult
    ///   {
    ///       Valid = false,
    ///       Message = "Some message"
    ///   };
    /// }
    /// return null;
    /// </example>
    /// <param name="sourceInstanceDataAccessor">The instance data accessor of the source copied from</param>
    /// <returns>The validation result object (null if no errors)</returns>
    public Task<InstantiationValidationResult?> Validate(IInstanceDataAccessor sourceInstanceDataAccessor);
}
