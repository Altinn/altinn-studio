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
/// asking the developer to decide whether the app should honor the new value.
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
    /// would still raise CS8632). Reads the project file first (its properties evaluate after the
    /// auto-imported props and win), then falls back to the nearest <c>Directory.Build.props</c> up
    /// the directory tree - the two places an app realistically sets <c>&lt;Nullable&gt;</c>. This is
    /// not full MSBuild evaluation (conditional property groups and explicit imports are not
    /// followed); per-file <c>#nullable</c> directives override the project default either way.
    /// </summary>
    public static bool ProjectEnablesNullableAnnotations(string projectFile)
    {
        if (ReadNullableProperty(projectFile) is { } fromProject)
        {
            return IsAnnotationsEnabled(fromProject);
        }

        for (
            var directory = Path.GetDirectoryName(Path.GetFullPath(projectFile));
            directory is not null;
            directory = Path.GetDirectoryName(directory)
        )
        {
            var propsFile = Path.Combine(directory, "Directory.Build.props");
            if (File.Exists(propsFile))
            {
                // MSBuild auto-imports only the nearest Directory.Build.props; stop at the first hit.
                return ReadNullableProperty(propsFile) is { } fromProps && IsAnnotationsEnabled(fromProps);
            }
        }

        return false;
    }

    private static string? ReadNullableProperty(string msbuildFile)
    {
        try
        {
            return XDocument.Load(msbuildFile).Descendants("Nullable").LastOrDefault()?.Value.Trim();
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static bool IsAnnotationsEnabled(string nullableValue) =>
        string.Equals(nullableValue, "enable", StringComparison.OrdinalIgnoreCase)
        || string.Equals(nullableValue, "annotations", StringComparison.OrdinalIgnoreCase);

    public MigrationResult Migrate()
    {
        var messages = new List<UpgradeMessage>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
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
            _scanner.Update(file, updatedRoot);

            foreach (var line in lines)
            {
                messages.Warn(
                    $"{file.RelativePath}:{line}: added '{NewParameterName}' parameter to {MethodName}. "
                        + "Review whether the implementation should use it (the receiver org number configured on the "
                        + "eFormidling service task) instead of ignoring it."
                );
            }
        }

        // This is an auto-migration: the app compiles again, so it does not require manual action even
        // though we ask the developer to review usage of the new parameter.
        return new MigrationResult(messages);
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
