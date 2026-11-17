using System.Collections.Frozen;
using Altinn.App.Core.Features.Validation.Default;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Every text the backend provides a default for. An app overrides one by adding a text resource with the same key.
/// </summary>
internal static class BuiltInTextResources
{
    public static readonly BackendTextResource PdfPreviewText = new()
    {
        Key = "pdf.preview_text",
        Texts = new LocalizedText(
            nb: "Dokumentet er en forhåndsvisning",
            nn: "Dokumentet er ein førehandsvisning",
            en: "The document is a preview"
        ),
    };

    public static readonly BackendTextResource PdfDefaultFileName = new()
    {
        Key = "pdf.default_file_name",
        Texts = LocalizedText.Invariant("{appName}.pdf"),
        Variables =
        [
            BackendTextVariable.Text(
                "appName",
                "appName",
                "The app's name, from the appName text.",
                fallback: "Altinn PDF"
            ),
        ],
    };

    /// <summary>
    /// The texts that are not validation issue texts. Those are in <see cref="BuiltInValidationIssues.All"/>.
    /// </summary>
    public static readonly IReadOnlyList<BackendTextResource> Other = [PdfPreviewText, PdfDefaultFileName];

    /// <summary>
    /// Every built-in text: the validation issue texts, then the others.
    /// </summary>
    public static readonly IReadOnlyList<BackendTextResource> All =
    [
        .. BuiltInValidationIssues.All.Select(definition => definition.TextResource),
        .. Other,
    ];

    public static readonly FrozenDictionary<string, BackendTextResource> ByKey = All.ToFrozenDictionary(text =>
        text.Key
    );

    /// <summary>
    /// The template for the key in nb, nn or en. Null for an unknown key or any other language.
    /// </summary>
    public static TextTemplate? Find(string key, string language) =>
        ByKey.TryGetValue(key, out var text) ? text.ToTemplate(language) : null;
}
