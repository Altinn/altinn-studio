using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Rendering;

/// <summary>
/// Renders a JSON document through a Typst template to PDF. Requires the
/// <c>typst</c> binary in the hosting image — see the library README for the
/// Dockerfile snippet. Steps without a template never touch this service, so
/// JSON-only enrichment works in a stock app image.
/// </summary>
public interface ITypstRenderer
{
    Task<byte[]> RenderPdfAsync(
        JsonDocument data,
        string templatePath,
        CancellationToken cancellationToken = default);
}
