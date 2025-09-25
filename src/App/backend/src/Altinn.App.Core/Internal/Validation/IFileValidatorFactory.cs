using Altinn.App.Core.Features.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Interface responsible for resolving the correct file validators to run on against a <see cref="DataType"/>.
/// </summary>
public interface IFileValidatorFactory
{
    /// <summary>
    /// Finds validator implementations based on the specified id's provided.
    /// </summary>
    IEnumerable<IFileValidator> GetFileValidators(IEnumerable<string> validatorIds);
}
