using Altinn.App.Core.Features.FileAnalysis;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using MimeDetective;

namespace Altinn.FileAnalyzers.MimeType;

/// <summary>
/// Analyses the file to find it's mimetype
/// </summary>
public class MimeTypeAnalyser : IFileAnalyser
{
    /// <summary>
    /// Initializes a new instance of the <see cref="MimeTypeAnalyser"/> class.
    /// </summary>
    public MimeTypeAnalyser(IHttpContextAccessor httpContextAccessor)
    {
        // Allow synchronous IO access for the usage of MimeDetective
        // which does not have async methods. This on a per request basis.
        var syncIOFeature = httpContextAccessor.HttpContext?.Features.Get<IHttpBodyControlFeature>();
        if (syncIOFeature != null)
        {
            syncIOFeature.AllowSynchronousIO = true;
        }
    }

    /// <inheritDoc/>
    public string Id { get; private set; } = "mimeTypeAnalyser";

    /// <summary>
    /// Analyses the file to find it's mimetype
    /// </summary>
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously. Suppressed because of the interface.
    public async Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
    {
        // TODO: Move to service registration as singleton
        var Inspector = new ContentInspectorBuilder()
        {
            Definitions = MimeDetective.Definitions.Default.All(),
            MatchEvaluatorOptions = new MimeDetective.Engine.DefinitionMatchEvaluatorOptions()
            {
                Include_Matches_Complete = true,
                Include_Matches_Failed = false,
                Include_Matches_Partial = true,
                Include_Segments_Prefix = true,
                Include_Segments_Strings = true
            }
        }
        .Build();

        var results = Inspector.Inspect(stream);

        // We only care for the 100% match anything else is considered unsafe.
        var match = results.OrderByDescending(match => match.Points).FirstOrDefault(match => match.Percentage == 1);

        var fileAnalysisResult = new FileAnalysisResult(Id);
        if (match != null)
        {
            fileAnalysisResult.Extensions = match.Definition.File.Extensions.ToList();
            fileAnalysisResult.MimeType = match.Definition.File.MimeType;
            fileAnalysisResult.Filename = filename;
        }

        return fileAnalysisResult;
    }
}
