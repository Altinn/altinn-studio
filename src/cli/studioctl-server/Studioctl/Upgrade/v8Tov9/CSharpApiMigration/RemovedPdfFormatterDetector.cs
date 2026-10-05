namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed <c>IPdfFormatter</c> and its default <c>NullPdfFormatter</c>. An
/// app that implements or registers the interface no longer compiles against v9, and the logic cannot
/// be translated automatically: the C# conditions have to become <c>hidden</c> expressions,
/// static <c>excludeFromPdf</c> lists or a custom PDF layout, so this only reports the usages, including
/// the DI registrations, for the developer to port by hand.
/// </summary>
internal sealed class RemovedPdfFormatterDetector
{
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IPdfFormatter",
        "NullPdfFormatter",
    };

    private const string Summary =
        "IPdfFormatter is removed in v9, so this code no longer compiles. Move its logic to "
        + "hidden expressions on the components, excludeFromPdf in the layout set's Settings.json, or a custom "
        + $"PDF layout with pdfLayoutName ({V9MigrationDocs.Pdf}), then delete the class and its DI registration. "
        + "Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedPdfFormatterDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
