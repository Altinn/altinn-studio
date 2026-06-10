using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.FileAnalyzis;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Files;

/// <inheritdoc />
internal class FileService(IFileAnalysisService fileAnalyserService, IFileValidationService fileValidationService)
    : IFileService
{
    /// <inheritdoc />
    public async Task<List<ValidationIssueWithSource>?> RunFileAnalysisAndValidation(
        DataType dataTypeFromMetadata,
        byte[] bytes,
        string? fileName
    )
    {
        List<FileAnalysisResult> fileAnalysisResults = [];
        if (dataTypeFromMetadata.EnabledFileAnalysers is { Count: > 0 })
        {
            fileAnalysisResults = (
                await fileAnalyserService.Analyse(dataTypeFromMetadata, new MemoryAsStream(bytes), fileName)
            ).ToList();
        }

        var fileValidationSuccess = true;
        List<ValidationIssueWithSource> validationIssues = [];
        if (dataTypeFromMetadata.EnabledFileValidators is { Count: > 0 })
        {
            (fileValidationSuccess, validationIssues) = await fileValidationService.Validate(
                dataTypeFromMetadata,
                fileAnalysisResults
            );
        }

        if (!fileValidationSuccess)
        {
            return validationIssues;
        }

        return null;
    }
}
