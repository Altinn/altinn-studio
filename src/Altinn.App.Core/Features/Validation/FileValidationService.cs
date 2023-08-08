using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation
{
    /// <summary>
    /// Validates files according to the registered IFileValidation interfaces
    /// </summary>
    public class FileValidationService : IFileValidationService
    {
        private readonly IFileValidatorFactory _fileValidatorFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="FileValidationService"/> class.
        /// </summary>
        public FileValidationService(IFileValidatorFactory fileValidatorFactory)
        {
            _fileValidatorFactory = fileValidatorFactory;
        }

        /// <summary>
        /// Runs all registered validators on the specified <see cref="DataType"/>
        /// </summary>
        public async Task<(bool Success, List<ValidationIssue> Errors)> Validate(DataType dataType, IEnumerable<FileAnalysisResult> fileAnalysisResults)
        {
            List<ValidationIssue> allErrors = new();
            bool allSuccess = true;
            
            List<IFileValidator> fileValidators = _fileValidatorFactory.GetFileValidators(dataType.EnabledFileValidators).ToList();
            foreach (IFileValidator fileValidator in fileValidators)
            {
                (bool success, IEnumerable<ValidationIssue> errors) = await fileValidator.Validate(dataType, fileAnalysisResults);
                if (!success)
                {
                    allSuccess = false;
                    allErrors.AddRange(errors);
                }
            }

            return (allSuccess, allErrors);
        }
    }
}
