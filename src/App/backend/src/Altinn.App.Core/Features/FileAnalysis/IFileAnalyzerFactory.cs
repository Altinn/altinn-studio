using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Interface responsible for resolving the correct file analyzers to run on against a <see cref="DataType"/>.
/// </summary>
public interface IFileAnalyzerFactory
{
    /// <summary>
    /// Finds analyzer implementations based on the specified id's provided.
    /// </summary>
    IEnumerable<IFileAnalyzer> GetFileAnalyzers(IEnumerable<string> analyzerIds);
}
