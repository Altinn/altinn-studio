using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefCSharpTypeRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-CSHARP-TYPE",
            "classRef must resolve to a C# class",
            "applicationmetadata.dataTypes[].appLogic.classRef should resolve to a "
                + "class declared under App/. Reported as a warning, not an error, because the "
                + "introspector sees only the app's own types — a classRef pointing at a "
                + "NuGet-package type (e.g. Altinn.App.Core.*) is not resolved and would "
                + "otherwise be a false positive.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.CSharpClass))
            yield return Metadata.Report(
                $"C# class \"{u.Value}\" was not found under App/ (typo in classRef, or type lives in a referenced package?)",
                u.Position
            );
    }
}
