using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation;

/// <summary>
/// Interface for handling validation of files added to an instance.
/// </summary>
[ImplementableByApps]
public interface IFileValidator
{
    /// <summary>
    /// The id of the validator to be used when enabling it from config.
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// Validating a file based on analysis results.
    /// </summary>
    Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(
        DataType dataType,
        IEnumerable<FileAnalysisResult> fileAnalysisResults
    );
}
