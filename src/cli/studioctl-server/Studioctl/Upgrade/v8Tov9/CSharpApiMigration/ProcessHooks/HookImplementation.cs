using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// An app type that implements a v8 hook member, and where: <see cref="Declaration"/> is the method in the app's
/// source, or <c>null</c> when the type inherits it from a package.
/// </summary>
/// <param name="TypeDeclaration">The declaration of the type that declares the method, or of the app type that inherits it.</param>
internal sealed record HookImplementation(
    HookFamily Family,
    INamedTypeSymbol Type,
    IMethodSymbol Method,
    ScannedCSharpFile File,
    TypeDeclarationSyntax TypeDeclaration,
    MethodDeclarationSyntax? Declaration
)
{
    public SemanticModel Model =>
        File.SemanticModel ?? throw new InvalidOperationException($"{File.RelativePath} has no semantic model.");

    /// <summary>The entry of the type's base list that names the v8 interface, or <c>null</c> when it gets it from another type.</summary>
    public BaseTypeSyntax? V8BaseType =>
        TypeDeclaration.BaseList?.Types.FirstOrDefault(baseType =>
            Model.GetTypeInfo(baseType.Type).Type is { } type
            && type.ToDisplayString() == Family.V8Interface
            && CSharpSemanticQueries.IsAltinnAppSymbol(type)
        );

    /// <summary>
    /// The implementations of <paramref name="family"/>'s v8 member in files with a semantic model, each once,
    /// resolved through the compilation so that an app interface or method with the same name is never taken for it.
    /// Members an Altinn type implements, and the defaults an interface provides, are left out.
    /// </summary>
    public static IReadOnlyList<HookImplementation> Find(HookFamily family, IReadOnlyList<ScannedCSharpFile> files)
    {
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        // An implementation in the app is found once, however many app types inherit it; one inherited from a package
        // is reported for each app type that inherits it.
        var seen = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        var found = new List<HookImplementation>();
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (model.GetDeclaredSymbol(declaration) is not { } type)
                {
                    continue;
                }

                foreach (var member in V8Members(family, type))
                {
                    if (
                        type.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation
                        || implementation.ContainingType.TypeKind == TypeKind.Interface
                        || CSharpSemanticQueries.IsAltinnAppSymbol(implementation)
                    )
                    {
                        continue;
                    }

                    var method = implementation.OriginalDefinition;
                    if (
                        SyntaxEditing.Locate(method, filesByTree) is var (methodFile, methodDeclaration)
                        && methodDeclaration.Parent is TypeDeclarationSyntax declaringType
                    )
                    {
                        if (seen.Add(method))
                        {
                            found.Add(
                                new(family, method.ContainingType, method, methodFile, declaringType, methodDeclaration)
                            );
                        }
                    }
                    else if (seen.Add(type))
                    {
                        found.Add(new(family, type, method, file, declaration, null));
                    }
                }
            }
        }

        return found;
    }

    /// <summary>The family's v8 member on the Altinn interface the type implements, if it does.</summary>
    private static IEnumerable<IMethodSymbol> V8Members(HookFamily family, INamedTypeSymbol type) =>
        type
            .AllInterfaces.Where(contract =>
                contract.ToDisplayString() == family.V8Interface && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
            )
            .SelectMany(contract => contract.GetMembers(family.V8Member))
            .OfType<IMethodSymbol>()
            .Where(member =>
                member.Parameters.Length == family.V8Parameters.Count
                && member.Parameters.Zip(family.V8Parameters).All(static pair => HasRoleType(pair.First, pair.Second))
            );

    private static bool HasRoleType(IParameterSymbol parameter, HookParameterRole role) =>
        role switch
        {
            HookParameterRole.TaskId => parameter.Type.SpecialType == SpecialType.System_String,
            HookParameterRole.Instance => parameter.Type.Name == "Instance",
            _ => true,
        };
}
