using Altinn.App.Core.Features.FileAnalysis;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using MimeDetective;

namespace Altinn.FileAnalyzers.MimeType;

internal sealed class MimeTypeAnalyser(
    IHttpContextAccessor _httpContextAccessor,
    IContentInspector _inspector
) : IFileAnalyser
{
    /// <inheritDoc/>
    public string Id { get; private set; } = "mimeTypeAnalyser";

    /// <inheritDoc/>
    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
    {
        // Allow synchronous IO access for the usage of MimeDetective
        // which does not have async methods. This on a per request basis.
        var syncIOFeature =
            _httpContextAccessor.HttpContext?.Features.Get<IHttpBodyControlFeature>();
        if (syncIOFeature is not null)
            syncIOFeature.AllowSynchronousIO = true;

        var results = _inspector.Inspect(stream);

        // We only care for the 100% match anything else is considered unsafe.
        var match = results
            .OrderByDescending(match => match.Points)
            .FirstOrDefault(match => match.Percentage == 1);

        var fileAnalysisResult = new FileAnalysisResult(Id);
        if (match is not null)
        {
            fileAnalysisResult.Extensions = match.Definition.File.Extensions.ToList();
            fileAnalysisResult.MimeType = match.Definition.File.MimeType;
            fileAnalysisResult.Filename = filename;
        }

        return Task.FromResult(fileAnalysisResult);
    }
}
