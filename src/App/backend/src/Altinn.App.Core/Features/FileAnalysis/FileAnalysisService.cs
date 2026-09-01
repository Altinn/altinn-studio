using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Analyses a file using the registered analyzers on the <see cref="DataType"/>
/// </summary>
public class FileAnalysisService : IFileAnalysisService
{
    private readonly IFileAnalyzerFactory _fileAnalyzerFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileAnalysisService"/> class.
    /// </summary>
    public FileAnalysisService(IFileAnalyzerFactory fileAnalyzerFactory, Telemetry? telemetry = null)
    {
        _fileAnalyzerFactory = fileAnalyzerFactory;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Runs the specified file analyzers against the stream provided.
    /// </summary>
    public async Task<IEnumerable<FileAnalysisResult>> Analyze(
        DataType dataType,
        Stream fileStream,
        string? filename = null
    )
    {
        using var activity = _telemetry?.StartAnalyzeActivity();
        List<IFileAnalyzer> fileAnalyzers = _fileAnalyzerFactory
            .GetFileAnalyzers(dataType.EnabledFileAnalysers)
            .ToList();

        List<FileAnalysisResult> fileAnalysisResults = new();
        foreach (var analyzer in fileAnalyzers)
        {
            if (fileStream.CanSeek)
            {
                fileStream.Position = fileStream.Seek(0, SeekOrigin.Begin);
            }
            var result = await analyzer.Analyze(fileStream, filename);
            result.AnalyzerId = analyzer.Id;
            result.Filename = filename;
            fileAnalysisResults.Add(result);
        }

        return fileAnalysisResults;
    }
}
