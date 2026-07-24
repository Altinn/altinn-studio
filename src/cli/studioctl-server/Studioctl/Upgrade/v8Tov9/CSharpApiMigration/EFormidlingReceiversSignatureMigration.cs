using System.Xml.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the <c>IEFormidlingReceivers.GetEFormidlingReceivers</c> signature change. In v9
/// the method gains a second parameter, <c>string? receiverFromConfig</c> (the receiver org number
/// configured on the eFormidling BPMN service task), and the old single-argument overload is removed -
/// so an app implementing the old shape no longer satisfies the interface (CS0535). Adding the
/// parameter is mechanical and gets the app compiling, so we apply it automatically and emit a warning
/// asking the developer to decide whether the app should honour the new value.
/// The parameter is annotated <c>string?</c> only where a nullable annotation context is active
/// (project <c>&lt;Nullable&gt;</c> or a preceding <c>#nullable</c> directive) - the v8 app template
/// has no nullable context, where <c>string?</c> would raise CS8632 on every build.
/// </summary>
internal sealed class EFormidlingReceiversSignatureMigration
{
    private const string InterfaceName = "IEFormidlingReceivers";
    private const string MethodName = "GetEFormidlingReceivers";
    private const string NewParameterName = "receiverFromConfig";

    private readonly CSharpSourceScanner _scanner;
    private readonly bool _projectNullableAnnotationsEnabled;

    public EFormidlingReceiversSignatureMigration(CSharpSourceScanner scanner, bool projectNullableAnnotationsEnabled)
    {
        _scanner = scanner;
        _projectNullableAnnotationsEnabled = projectNullableAnnotationsEnabled;
    }

    /// <summary>
    /// Whether the project enables nullable reference type <em>annotations</em> (<c>enable</c> or
    /// <c>annotations</c>; <c>warnings</c> enables only the warning context, where <c>string?</c>
    /// would still raise CS8632).
    /// </summary>
    public static bool ProjectEnablesNullableAnnotations(string projectFile)
    {
        try
        {
            var value = XDocument.Load(projectFile).Descendants("Nullable").LastOrDefault()?.Value.Trim();
            return string.Equals(value, "enable", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "annotations", StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    public MigrationResult Migrate()
    {
        var warnings = new List<string>();

        foreach (var file in _scanner.Files)
        {
            var methods = FindMethodsToMigrate(file.Root).ToArray();
            if (methods.Length == 0)
            {
                continue;
            }

            var lines = methods.Select(file.GetLine).ToArray();
            var updatedRoot = file.Root.ReplaceNodes(
                methods,
                (original, _) =>
                    AddReceiverParameter(
                        original,
                        nullable: NullableAnnotationsActiveAt(file.Root, original, _projectNullableAnnotationsEnabled)
                    )
            );
            File.WriteAllText(file.Path, updatedRoot.ToFullString());

            foreach (var line in lines)
            {
                warnings.Add(
                    $"{file.RelativePath}:{line}: added '{NewParameterName}' parameter to {MethodName}. "
                        + "Review whether the implementation should use it (the receiver org number configured on the "
                        + "eFormidling service task) instead of ignoring it."
                );
            }
        }

        // This is an auto-migration: the app compiles again, so it does not require manual action even
        // though we ask the developer to review usage of the new parameter.
        return new MigrationResult(ManualActionRequired: false, warnings);
    }

    private static IEnumerable<MethodDeclarationSyntax> FindMethodsToMigrate(CompilationUnitSyntax root)
    {
        foreach (var type in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var implementsInterface = type.BaseList?.Types.Any(baseType => SimpleName(baseType.Type) == InterfaceName);

            foreach (var method in type.Members.OfType<MethodDeclarationSyntax>())
            {
                if (method.Identifier.Text != MethodName)
                {
                    continue;
                }

                // Only the old single-parameter overload; a method already carrying the extra parameter
                // (two parameters) has been migrated, so this is idempotent.
                if (method.ParameterList.Parameters.Count != 1)
                {
                    continue;
                }

                var isExplicitInterfaceImpl = SimpleName(method.ExplicitInterfaceSpecifier?.Name) == InterfaceName;
                if (implementsInterface == true || isExplicitInterfaceImpl)
                {
                    yield return method;
                }
            }
        }
    }

    private static MethodDeclarationSyntax AddReceiverParameter(MethodDeclarationSyntax method, bool nullable)
    {
        var newParameter = SyntaxFactory
            .Parameter(SyntaxFactory.Identifier(NewParameterName))
            .WithType(
                SyntaxFactory.ParseTypeName(nullable ? "string?" : "string").WithTrailingTrivia(SyntaxFactory.Space)
            )
            .WithLeadingTrivia(SyntaxFactory.Space);

        return method.WithParameterList(method.ParameterList.AddParameters(newParameter));
    }

    /// <summary>
    /// Syntactic approximation of the nullable annotation context at <paramref name="method"/>: the
    /// last preceding <c>#nullable</c> directive targeting annotations wins; without one, the
    /// project-level default applies. (No semantic model is available - see
    /// <see cref="CSharpSourceScanner"/>.)
    /// </summary>
    private static bool NullableAnnotationsActiveAt(
        CompilationUnitSyntax root,
        MethodDeclarationSyntax method,
        bool projectDefault
    )
    {
        var lastDirective = root.DescendantNodes(descendIntoTrivia: true)
            .OfType<NullableDirectiveTriviaSyntax>()
            .LastOrDefault(directive =>
                directive.SpanStart < method.SpanStart
                && (
                    directive.TargetToken.IsKind(SyntaxKind.None)
                    || directive.TargetToken.IsKind(SyntaxKind.AnnotationsKeyword)
                )
            );

        return lastDirective?.SettingToken.Kind() switch
        {
            SyntaxKind.EnableKeyword => true,
            SyntaxKind.DisableKeyword => false,
            _ => projectDefault, // no directive, or `restore` back to the project default
        };
    }

    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            _ => null,
        };

    private static string? SimpleName(NameSyntax? name) =>
        name switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            _ => null,
        };
}
