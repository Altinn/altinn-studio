using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Interface for running all file analyzers registered on a data type.
/// </summary>
public interface IFileAnalysisService
{
    /// <summary>
    /// Analyses the the specified file stream.
    /// </summary>
    /// <param name="dataType">The <see cref="DataType"/> where the analyzers are registered.</param>
    /// <param name="fileStream">The file stream to analyze</param>
    /// <param name="filename">The name of the file</param>
    Task<IEnumerable<FileAnalysisResult>> Analyze(DataType dataType, Stream fileStream, string? filename = null);
}
