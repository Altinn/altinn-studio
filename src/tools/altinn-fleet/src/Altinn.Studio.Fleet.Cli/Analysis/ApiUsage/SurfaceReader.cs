using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>A type or member of the app library.</summary>
/// <param name="Symbol">Its documentation comment ID.</param>
/// <param name="Assembly">The assembly that declares it.</param>
/// <param name="Kind">What it is, such as <c>interface</c> or <c>method</c>.</param>
/// <param name="Namespace">Its namespace.</param>
/// <param name="ContainingType">The type that declares it, or <c>null</c> for a top-level type.</param>
/// <param name="Visible">
/// Whether code outside the assembly can use it. Only types are listed when they are not, so that a symbol missing
/// from a later version can be told apart from one that became internal.
/// </param>
/// <param name="Obsolete">Whether it, or a type that contains it, is marked obsolete.</param>
/// <param name="ExtensionPoint">Whether it is an interface or an abstract class, or a member of one.</param>
/// <param name="File">Its source file, relative to the folder the projects were read from, when read from source.</param>
/// <param name="Line">The line in that file.</param>
/// <param name="Exposes">
/// The app library types its signature names: parameter, return and property types, base types, interfaces and
/// generic constraints. They have to stay public for as long as it does.
/// </param>
internal sealed record SurfaceEntry(
    string Symbol,
    string Assembly,
    string Kind,
    string Namespace,
    string? ContainingType,
    bool Visible,
    bool Obsolete,
    bool ExtensionPoint,
    string? File,
    int? Line,
    IReadOnlyList<string> Exposes
);

/// <summary>Lists the types and members that the app library exposes outside its assemblies.</summary>
/// <remarks>MSBuild must be registered with <see cref="MSBuildSetup.EnsureRegistered"/> before it is called.</remarks>
internal static class SurfaceReader
{
    /// <summary>
    /// Reads the app library from projects: its own source projects, or with <paramref name="fromReferences"/>, the
    /// app library packages that the projects reference.
    /// </summary>
    public static async Task<List<SurfaceEntry>> Read(
        IReadOnlyList<string> projectFiles,
        bool fromReferences,
        string? sourceRoot,
        CancellationToken cancellationToken
    )
    {
        using var workspace = MSBuildWorkspace.Create();
        var entries = new Dictionary<string, SurfaceEntry>(StringComparer.Ordinal);
        var seenAssemblies = new HashSet<string>(StringComparer.Ordinal);
        foreach (string projectFile in projectFiles)
        {
            Project project = await workspace.OpenProjectAsync(
                Path.GetFullPath(projectFile),
                cancellationToken: cancellationToken
            );
            IEnumerable<Project> projects = fromReferences ? [project] : project.Solution.Projects;
            foreach (Project current in projects)
            {
                Compilation compilation =
                    await current.GetCompilationAsync(cancellationToken)
                    ?? throw new InvalidOperationException($"{current.FilePath} has no compilation.");
                IEnumerable<IAssemblySymbol> assemblies = fromReferences
                    ? compilation.References.Select(compilation.GetAssemblyOrModuleSymbol).OfType<IAssemblySymbol>()
                    : [compilation.Assembly];
                foreach (IAssemblySymbol assembly in assemblies)
                {
                    if (LibrarySymbols.IsLibraryAssembly(assembly.Name) && seenAssemblies.Add(assembly.Name))
                    {
                        new Visitor(entries, sourceRoot).Visit(assembly.GlobalNamespace);
                    }
                }
            }
        }

        return [.. entries.Values.OrderBy(e => e.Symbol, StringComparer.Ordinal)];
    }

    /// <summary>
    /// Reads a published app library version, from its packages. <c>Altinn.App.Clients.Fiks</c> is left out for
    /// versions that did not publish it.
    /// </summary>
    public static async Task<List<SurfaceEntry>> ReadPublished(string version, CancellationToken cancellationToken)
    {
        string folder = Path.Join(Path.GetTempPath(), $"fleet-surface-{Guid.NewGuid():N}");
        Directory.CreateDirectory(folder);
        try
        {
            string projectFile = Path.Join(folder, "Surface.csproj");
            string? error = null;
            foreach (
                string[] packages in (string[][])
                    [
                        [.. s_packages, FiksPackage],
                        s_packages,
                    ]
            )
            {
                await File.WriteAllTextAsync(projectFile, ReferencingProject(packages, version), cancellationToken);
                error = await Dotnet.Restore(projectFile, cancellationToken);
                if (error is null)
                {
                    return await Read([projectFile], fromReferences: true, sourceRoot: null, cancellationToken);
                }
            }

            throw new FleetException($"Could not restore the app library packages of version {version}: {error}");
        }
        finally
        {
            Directory.Delete(folder, recursive: true);
        }
    }

    private const string FiksPackage = "Altinn.App.Clients.Fiks";

    private static readonly string[] s_packages = ["Altinn.App.Api", "Altinn.App.Core"];

    // The newest target framework reads packages for every older one.
    private static string ReferencingProject(IEnumerable<string> packages, string version) =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net{Environment.Version.Major}.0</TargetFramework>
                <ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally>
                <NuGetAudit>false</NuGetAudit>
              </PropertyGroup>
              <ItemGroup>
            {string.Join('\n', packages.Select(p => $"    <PackageReference Include=\"{p}\" Version=\"{version}\" />"))}
              </ItemGroup>
            </Project>
            """;

    private sealed class Visitor(Dictionary<string, SurfaceEntry> entries, string? sourceRoot)
    {
        public void Visit(INamespaceSymbol ns)
        {
            foreach (INamespaceSymbol child in ns.GetNamespaceMembers())
            {
                Visit(child);
            }

            foreach (INamedTypeSymbol type in ns.GetTypeMembers())
            {
                VisitType(type);
            }
        }

        private void VisitType(INamedTypeSymbol type)
        {
            if (!IsVisible(type))
            {
                Add(type, visible: false);
                return;
            }

            Add(type, visible: true);
            foreach (ISymbol member in type.GetMembers())
            {
                if (member is INamedTypeSymbol nested)
                {
                    VisitType(nested);
                }
                else if (IsListed(member) && IsVisible(member))
                {
                    Add(member, visible: true);
                }
            }
        }

        // Accessors are reached through their property or event, and the compiler's own members are not API,
        // apart from the default constructor that code calls.
        private static bool IsListed(ISymbol member) =>
            member switch
            {
                IMethodSymbol { AssociatedSymbol: not null } => false,
                IMethodSymbol { MethodKind: MethodKind.Constructor } => true,
                _ => !member.IsImplicitlyDeclared,
            };

        private static bool IsVisible(ISymbol symbol)
        {
            for (
                ISymbol? current = symbol;
                current is not null and not INamespaceSymbol;
                current = current.ContainingSymbol
            )
            {
                bool visible = current.DeclaredAccessibility switch
                {
                    Accessibility.Public => true,
                    Accessibility.Protected or Accessibility.ProtectedOrInternal => current.ContainingType
                        is { IsSealed: false },
                    _ => false,
                };
                if (!visible)
                {
                    return false;
                }
            }

            return true;
        }

        private void Add(ISymbol symbol, bool visible)
        {
            if (symbol.GetDocumentationCommentId() is not { } id)
            {
                return;
            }

            FileLinePositionSpan? location = symbol.Locations.FirstOrDefault(l => l.IsInSource)?.GetLineSpan();
            INamedTypeSymbol? type = symbol as INamedTypeSymbol ?? symbol.ContainingType;
            entries[id] = new SurfaceEntry(
                id,
                symbol.ContainingAssembly.Name,
                Describe(symbol),
                symbol.ContainingNamespace?.ToDisplayString() ?? "",
                symbol.ContainingType?.GetDocumentationCommentId(),
                visible,
                IsObsolete(symbol),
                type is { TypeKind: TypeKind.Interface } or { TypeKind: TypeKind.Class, IsAbstract: true },
                location is { } span ? SourcePath(span.Path) : null,
                location is { } line ? line.StartLinePosition.Line + 1 : null,
                visible ? Exposed(symbol) : []
            );
        }

        private string SourcePath(string path) =>
            sourceRoot is null ? path : Path.GetRelativePath(sourceRoot, path).Replace('\\', '/');

        private static bool IsObsolete(ISymbol symbol)
        {
            for (
                ISymbol? current = symbol;
                current is not null and not INamespaceSymbol;
                current = current.ContainingSymbol
            )
            {
                if (current.GetAttributes().Any(a => a.AttributeClass?.Name == nameof(ObsoleteAttribute)))
                {
                    return true;
                }
            }

            return false;
        }

        private static List<string> Exposed(ISymbol symbol)
        {
            var found = new SortedSet<string>(StringComparer.Ordinal);
            void AddType(ITypeSymbol? type)
            {
                switch (type)
                {
                    case IArrayTypeSymbol array:
                        AddType(array.ElementType);
                        break;
                    case IPointerTypeSymbol pointer:
                        AddType(pointer.PointedAtType);
                        break;
                    case INamedTypeSymbol named:
                        foreach (ITypeSymbol argument in named.TypeArguments)
                        {
                            AddType(argument);
                        }

                        if (
                            LibrarySymbols.IsLibrary(named)
                            && named.OriginalDefinition.GetDocumentationCommentId() is { } id
                        )
                        {
                            found.Add(id);
                        }

                        AddType(named.ContainingType);
                        break;
                }
            }

            void AddConstraints(IEnumerable<ITypeParameterSymbol> parameters)
            {
                foreach (ITypeSymbol constraint in parameters.SelectMany(p => p.ConstraintTypes))
                {
                    AddType(constraint);
                }
            }

            void AddSignature(ITypeSymbol returnType, IEnumerable<IParameterSymbol> parameters)
            {
                AddType(returnType);
                foreach (IParameterSymbol parameter in parameters)
                {
                    AddType(parameter.Type);
                }
            }

            switch (symbol)
            {
                case INamedTypeSymbol type:
                    AddType(type.BaseType);
                    foreach (INamedTypeSymbol iface in type.Interfaces)
                    {
                        AddType(iface);
                    }

                    AddConstraints(type.TypeParameters);
                    if (type.DelegateInvokeMethod is { } invoke)
                    {
                        AddSignature(invoke.ReturnType, invoke.Parameters);
                    }

                    break;
                case IMethodSymbol method:
                    AddSignature(method.ReturnType, method.Parameters);
                    AddConstraints(method.TypeParameters);
                    break;
                case IPropertySymbol property:
                    AddSignature(property.Type, property.Parameters);
                    break;
                case IFieldSymbol field:
                    AddType(field.Type);
                    break;
                case IEventSymbol @event:
                    AddType(@event.Type);
                    break;
            }

            found.Remove(symbol.GetDocumentationCommentId() ?? "");
            return [.. found];
        }

        private static string Describe(ISymbol symbol) =>
            symbol switch
            {
                INamedTypeSymbol t => t.TypeKind switch
                {
                    TypeKind.Interface => "interface",
                    TypeKind.Enum => "enum",
                    TypeKind.Delegate => "delegate",
                    TypeKind.Struct => t.IsRecord ? "record struct" : "struct",
                    _ => t.IsRecord ? "record"
                    : t.IsStatic ? "static class"
                    : "class",
                },
                IMethodSymbol { MethodKind: MethodKind.Constructor } => "constructor",
                IMethodSymbol { IsExtensionMethod: true } => "extension method",
                IMethodSymbol => "method",
                IPropertySymbol => "property",
                IFieldSymbol { IsConst: true } => "constant",
                IFieldSymbol => "field",
                IEventSymbol => "event",
                _ => symbol.Kind.ToString().ToLowerInvariant(),
            };
    }
}
