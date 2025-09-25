using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.FileAnalyzis;

/// <summary>
/// Factory class that resolves the correct file analysers to run on against a <see cref="DataType"/>.
/// </summary>
public class FileAnalyserFactory : IFileAnalyserFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileAnalyserFactory"/> class.
    /// </summary>
    public FileAnalyserFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the specified file analyser implementations based on the specified analyser id's.
    /// </summary>
    public IEnumerable<IFileAnalyser> GetFileAnalysers(IEnumerable<string> analyserIds)
    {
        var analysers = _appImplementationFactory.GetAll<IFileAnalyser>();
        return analysers.Where(x => analyserIds.Contains(x.Id)).ToArray();
    }
}
