using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Factory class that resolves the correct file analyzers to run on against a <see cref="DataType"/>.
/// </summary>
public class FileAnalyserFactory : IFileAnalyserFactory
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
    /// Finds the specified file analyser implementations based on the specified analyser id's.
    /// </summary>
    public IEnumerable<IFileAnalyser> GetFileAnalyzers(IEnumerable<string> analyzerIds)
    {
        var analyzers = _appImplementationFactory.GetAll<IFileAnalyzer>();
        return analyzers.Where(x => analyzerIds.Contains(x.Id)).ToArray();
    }
}
