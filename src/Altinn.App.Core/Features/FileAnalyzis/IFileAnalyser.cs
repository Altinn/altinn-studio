namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Interface for doing extended binary file analysing.
/// </summary>
[ImplementableByApps]
public interface IFileAnalyser
{
    /// <summary>
    /// The id of the analyser to be used when enabling it from config.
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// Analyses a stream with the intent to extract metadata.
    /// </summary>
    /// <param name="stream">The stream to analyse. One stream = one file.</param>
    /// <param name="filename">Filename. Optional parameter if the implementation needs the name of the file, relative or absolute path.</param>
    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null);
}
