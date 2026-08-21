using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Factory class that resolves the correct file analyzers to run on against a <see cref="DataType"/>.
/// </summary>
public class FileAnalyzerFactory : IFileAnalyzerFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileAnalyzerFactory"/> class.
    /// </summary>
    public FileAnalyzerFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the specified file analyzer implementations based on the specified analyzer id's.
    /// </summary>
    public IEnumerable<IFileAnalyzer> GetFileAnalyzers(IEnumerable<string> analyzerIds)
    {
        var analyzers = _appImplementationFactory.GetAll<IFileAnalyzer>();
        return analyzers.Where(x => analyzerIds.Contains(x.Id)).ToArray();
    }
}
