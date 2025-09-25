using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalyzis;

/// <summary>
/// Interface for running all file analysers registered on a data type.
/// </summary>
public interface IFileAnalysisService
{
    /// <summary>
    /// Analyses the the specified file stream.
    /// </summary>
    /// <param name="dataType">The <see cref="DataType"/> where the anlysers are registered.</param>
    /// <param name="fileStream">The file stream to analyse</param>
    /// <param name="filename">The name of the file</param>
    Task<IEnumerable<FileAnalysisResult>> Analyse(DataType dataType, Stream fileStream, string? filename = null);
}
