using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalyzis;

/// <summary>
/// Analyses a file using the registred analysers on the <see cref="DataType"/>
/// </summary>
public class FileAnalysisService : IFileAnalysisService
{
    private readonly IFileAnalyserFactory _fileAnalyserFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileAnalysisService"/> class.
    /// </summary>
    public FileAnalysisService(IFileAnalyserFactory fileAnalyserFactory, Telemetry? telemetry = null)
    {
        _fileAnalyserFactory = fileAnalyserFactory;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Runs the specified file analysers against the stream provided.
    /// </summary>
    public async Task<IEnumerable<FileAnalysisResult>> Analyse(
        DataType dataType,
        Stream fileStream,
        string? filename = null
    )
    {
        using var activity = _telemetry?.StartAnalyseActivity();
        List<IFileAnalyser> fileAnalysers = _fileAnalyserFactory
            .GetFileAnalysers(dataType.EnabledFileAnalysers)
            .ToList();

        List<FileAnalysisResult> fileAnalysisResults = new();
        foreach (var analyser in fileAnalysers)
        {
            if (fileStream.CanSeek)
            {
                fileStream.Position = fileStream.Seek(0, SeekOrigin.Begin);
            }
            var result = await analyser.Analyse(fileStream, filename);
            result.AnalyserId = analyser.Id;
            result.Filename = filename;
            fileAnalysisResults.Add(result);
        }

        return fileAnalysisResults;
    }
}
