using Altinn.App.Core.Features;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Validates files according to the registered IFileValidation interfaces
/// </summary>
public class FileValidationService : IFileValidationService
{
    private readonly IFileValidatorFactory _fileValidatorFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileValidationService"/> class.
    /// </summary>
    public FileValidationService(IFileValidatorFactory fileValidatorFactory, Telemetry? telemetry = null)
    {
        _fileValidatorFactory = fileValidatorFactory;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Runs all registered validators on the specified <see cref="DataType"/>
    /// </summary>
    public async Task<(bool Success, List<ValidationIssueWithSource> Errors)> Validate(
        DataType dataType,
        List<FileAnalysisResult> fileAnalysisResults
    )
    {
        using var activity = _telemetry?.StartFileValidateActivity();
        List<ValidationIssueWithSource> allErrors = new();
        bool allSuccess = true;

        List<IFileValidator> fileValidators = _fileValidatorFactory
            .GetFileValidators(dataType.EnabledFileValidators)
            .ToList();
        foreach (IFileValidator fileValidator in fileValidators)
        {
            (bool success, IEnumerable<ValidationIssue> errors) = await fileValidator.Validate(
                dataType,
                fileAnalysisResults
            );
            if (!success)
            {
                allSuccess = false;
                allErrors.AddRange(
                    errors.Select(e =>
                        ValidationIssueWithSource.FromIssue(
                            e,
                            fileValidator.GetType().Name,
                            noIncrementalUpdates: false
                        )
                    )
                );
            }
        }

        return (allSuccess, allErrors);
    }
}
