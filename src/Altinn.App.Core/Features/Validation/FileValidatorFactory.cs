using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation
{
    /// <summary>
    /// Factory class that resolves the correct file validators to run on against a <see cref="DataType"/>.
    /// </summary>
    public class FileValidatorFactory : IFileValidatorFactory
    {
        private readonly IEnumerable<IFileValidator> _fileValidators;

        /// <summary>
        /// Initializes a new instance of the <see cref="FileValidatorFactory"/> class.
        /// </summary>
        public FileValidatorFactory(IEnumerable<IFileValidator> fileValidators)
        {
            _fileValidators = fileValidators;
        }

        /// <summary>
        /// Finds the specified file analyser implementations based on the specified analyser id's.
        /// </summary>
        public IEnumerable<IFileValidator> GetFileValidators(IEnumerable<string> validatorIds)
        {
            return _fileValidators.Where(x => validatorIds.Contains(x.Id)).ToList();
        }
    }
}
