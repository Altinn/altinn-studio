using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Factory class that resolves the correct file validators to run on against a <see cref="DataType"/>.
/// </summary>
public class FileValidatorFactory : IFileValidatorFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileValidatorFactory"/> class.
    /// </summary>
    public FileValidatorFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the specified file analyser implementations based on the specified analyser id's.
    /// </summary>
    public IEnumerable<IFileValidator> GetFileValidators(IEnumerable<string> validatorIds)
    {
        var validators = _appImplementationFactory.GetAll<IFileValidator>();
        return validators.Where(x => validatorIds.Contains(x.Id)).ToArray();
    }
}
