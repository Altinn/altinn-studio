using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalyzis;

/// <summary>
/// Interface responsible for resolving the correct file analysers to run on against a <see cref="DataType"/>.
/// </summary>
public interface IFileAnalyserFactory
{
    /// <summary>
    /// Finds analyser implementations based on the specified id's provided.
    /// </summary>
    IEnumerable<IFileAnalyser> GetFileAnalysers(IEnumerable<string> analyserIds);
}
