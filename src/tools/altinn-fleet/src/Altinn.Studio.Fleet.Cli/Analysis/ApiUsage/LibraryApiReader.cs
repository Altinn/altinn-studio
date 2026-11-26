using System.Text.RegularExpressions;
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
internal sealed record LibraryApiEntry(
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

/// <summary>The app library's projects in a folder.</summary>
/// <param name="Root">The folder given, which the source files are recorded relative to.</param>
/// <param name="Projects">The projects of the app library's packages that the folder has.</param>
internal sealed record LibrarySource(string Root, IReadOnlyList<string> Projects);

/// <summary>Lists the types and members that the app library exposes outside its assemblies: its public API.</summary>
/// <remarks>MSBuild must be registered with <see cref="MSBuildSetup.EnsureRegistered"/> before it reads.</remarks>
internal static class LibraryApiReader
{
    // Where the app library's projects are in a checkout of altinn-studio, of app-lib-dotnet, or in the folder itself.
    private static readonly string[] s_projectFolders = ["src/App/backend/src", "src", ""];

    /// <summary>
    /// Finds the app library's projects in a checkout of altinn-studio or app-lib-dotnet, or in the folder that holds
    /// them.
    /// </summary>
    /// <exception cref="UsageException">The folder has no app library.</exception>
    public static LibrarySource FindSource(string path)
    {
        string root = Path.GetFullPath(path);
        foreach (string folder in s_projectFolders)
        {
            List<string> projects =
            [
                .. ((string[])[ApiPackage, CorePackage, FiksPackage])
                    .Select(package => Path.Join(root, folder, package, $"{package}.csproj"))
                    .Where(File.Exists),
            ];
            if (projects.Count > 0 && projects[0].EndsWith($"{ApiPackage}.csproj", StringComparison.Ordinal))
            {
                return new LibrarySource(root, projects);
            }
        }

        throw new UsageException(
            $"--source {path} has no {ApiPackage} project. Give a checkout of altinn-studio or app-lib-dotnet."
        );
    }

    /// <summary>Reads the app library from its source, which it restores and compiles.</summary>
    public static Task<List<LibraryApiEntry>> ReadSource(LibrarySource source, CancellationToken cancellationToken) =>
        Read(source.Projects, fromReferences: false, source.Root, cancellationToken);

    /// <summary>
    /// Reads the app library from projects: its own source projects, which it restores first, or with
    /// <paramref name="fromReferences"/>, the app library packages that already restored projects reference.
    /// </summary>
    public static async Task<List<LibraryApiEntry>> Read(
        IReadOnlyList<string> projectFiles,
        bool fromReferences,
        string? sourceRoot,
        CancellationToken cancellationToken
    )
    {
        using var workspace = MSBuildWorkspace.Create(Dotnet.BuildProperties());
        var loadFailures = new List<string>();
        workspace.RegisterWorkspaceFailedHandler(args =>
        {
            if (args.Diagnostic.Kind == WorkspaceDiagnosticKind.Failure)
            {
                loadFailures.Add(args.Diagnostic.Message);
            }
        });
        var entries = new Dictionary<string, LibraryApiEntry>(StringComparer.Ordinal);
        // A project that targets several frameworks loads once per framework, and each can expose more.
        var seenProjects = new HashSet<string>(StringComparer.Ordinal);
        var seenAssemblies = new HashSet<string>(StringComparer.Ordinal);
        foreach (string projectFile in projectFiles)
        {
            if (
                !fromReferences
                && await Dotnet.Restore(Path.GetFullPath(projectFile), cancellationToken) is { } restoreError
            )
            {
                throw new FleetException($"Could not restore {projectFile}: {restoreError}");
            }

            // A project that an earlier one references is loaded already, and opening it again throws.
            string fullPath = Path.GetFullPath(projectFile);
            Project project =
                workspace.CurrentSolution.Projects.FirstOrDefault(p => p.FilePath == fullPath)
                ?? await workspace.OpenProjectAsync(fullPath, cancellationToken: cancellationToken);
            IEnumerable<Project> projects = fromReferences ? [project] : workspace.CurrentSolution.Projects;
            foreach (Project current in projects)
            {
                if (!seenProjects.Add($"{current.FilePath}|{current.Name}"))
                {
                    continue;
                }

                Compilation compilation =
                    await current.GetCompilationAsync(cancellationToken)
                    ?? throw new FleetException($"{current.FilePath} has no compilation.");
                // A project that did not load or compile yields part of the API, which must not replace the whole of it.
                Diagnostic? error = fromReferences
                    ? null
                    : compilation
                        .GetDiagnostics(cancellationToken)
                        .FirstOrDefault(d => d.Severity == DiagnosticSeverity.Error);
                string? failure =
                    loadFailures.FirstOrDefault()
                    ?? error?.ToString()
                    ?? (fromReferences ? null : await Generators.FindFailure(current, compilation, cancellationToken));
                if (failure is not null)
                {
                    throw new FleetException($"{current.FilePath} did not load or compile: {failure}");
                }

                if (fromReferences)
                {
                    foreach (
                        IAssemblySymbol assembly in compilation
                            .References.Select(compilation.GetAssemblyOrModuleSymbol)
                            .OfType<IAssemblySymbol>()
                    )
                    {
                        if (LibrarySymbols.IsLibraryAssembly(assembly.Name) && seenAssemblies.Add(assembly.Name))
                        {
                            new Visitor(entries, sourceRoot).Visit(assembly.GlobalNamespace);
                        }
                    }
                }
                else if (LibrarySymbols.IsLibraryAssembly(compilation.Assembly.Name))
                {
                    new Visitor(entries, sourceRoot).Visit(compilation.Assembly.GlobalNamespace);
                }
            }
        }

        if (!entries.Values.Any(e => e.Visible))
        {
            throw new FleetException("The projects expose nothing of the app library.");
        }

        return [.. entries.Values.OrderBy(e => e.Symbol, StringComparer.Ordinal)];
    }

    /// <summary>Reads one assembly's types and members, such as a compiled app library.</summary>
    internal static List<LibraryApiEntry> ReadAssembly(IAssemblySymbol assembly, string? sourceRoot)
    {
        var entries = new Dictionary<string, LibraryApiEntry>(StringComparer.Ordinal);
        new Visitor(entries, sourceRoot).Visit(assembly.GlobalNamespace);
        return [.. entries.Values.OrderBy(e => e.Symbol, StringComparer.Ordinal)];
    }

    /// <summary>
    /// The packages that a restore says do not exist at the version asked for, or <c>null</c> when it failed for
    /// another reason too.
    /// </summary>
    internal static HashSet<string>? MissingPackages(string restoreError)
    {
        var missing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (
            string line in restoreError.Split(
                '\n',
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
            )
        )
        {
            // NuGet continues these messages on lines of their own, such as the versions it did find.
            if (s_missingPackage.Match(line) is { Success: true } match)
            {
                missing.Add(match.Groups["package"].Value);
            }
            else if (
                line.Contains("error", StringComparison.OrdinalIgnoreCase)
                && !line.Contains("NU1101", StringComparison.Ordinal)
                && !line.Contains("NU1102", StringComparison.Ordinal)
            )
            {
                return null;
            }
        }

        return missing.Count == 0 ? null : missing;
    }

    /// <summary>
    /// Reads a published app library version, from its packages at exactly that version. The packages a version did
    /// not publish, such as <c>Altinn.App.Clients.Fiks</c> before it existed or <c>Altinn.App.Core</c> before v7, are
    /// left out rather than taken from a later version.
    /// </summary>
    public static async Task<List<LibraryApiEntry>> ReadPublished(string version, CancellationToken cancellationToken)
    {
        string folder = Path.Join(Path.GetTempPath(), $"fleet-library-api-{Guid.NewGuid():N}");
        Directory.CreateDirectory(folder);
        try
        {
            string projectFile = Path.Join(folder, "LibraryApi.csproj");
            List<string> packages = [ApiPackage, CorePackage, FiksPackage];
            while (true)
            {
                await File.WriteAllTextAsync(projectFile, ReferencingProject(packages, version), cancellationToken);
                if (await Dotnet.Restore(projectFile, cancellationToken) is not { } error)
                {
                    return await Read([projectFile], fromReferences: true, sourceRoot: null, cancellationToken);
                }

                // Only a package that does not exist at this version is left out. Any other failure, such as a feed
                // that did not answer or a missing dependency, would make the API silently smaller.
                HashSet<string>? missing = MissingPackages(error);
                if (missing is null || missing.Contains(ApiPackage) || !missing.IsSubsetOf(packages))
                {
                    throw new FleetException(
                        $"Could not restore the app library packages of version {version}: {error}"
                    );
                }

                packages.RemoveAll(missing.Contains);
            }
        }
        finally
        {
            Directory.Delete(folder, recursive: true);
        }
    }

    private const string ApiPackage = "Altinn.App.Api";

    private const string CorePackage = "Altinn.App.Core";

    private const string FiksPackage = "Altinn.App.Clients.Fiks";

    // NuGet's "Unable to find package X with version (= V)" (NU1102), or "Unable to find package X" (NU1101).
    private static readonly Regex s_missingPackage = new(
        @"NU110[12]: Unable to find package (?<package>[^\s]+?)\.?(?:\s|$)",
        RegexOptions.CultureInvariant
    );

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
            {string.Join(
                '\n',
                packages.Select(p => $"    <PackageReference Include=\"{p}\" Version=\"[{version}]\" />")
            )}
              </ItemGroup>
            </Project>
            """;

    private sealed class Visitor(Dictionary<string, LibraryApiEntry> entries, string? sourceRoot)
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

        // Accessors are reached through their property or event. The members the compiler writes, such as a record's
        // Equals and Deconstruct or a delegate's Invoke, come with their type rather than being decisions of their
        // own, so they are left out the same way from source, where they are implicitly declared, and from
        // packages, where they carry [CompilerGenerated]. A class's default constructor is listed, since code
        // calls it.
        private static bool IsListed(ISymbol member) =>
            member switch
            {
                IMethodSymbol { AssociatedSymbol: not null } => false,
                { ContainingType.TypeKind: TypeKind.Delegate } => false,
                // The implicit constructor is a class's default one, or a record's copy constructor.
                IMethodSymbol { MethodKind: MethodKind.Constructor } constructor => constructor.IsImplicitlyDeclared
                    ? constructor.Parameters.IsEmpty && !constructor.ContainingType.IsValueType
                    : !IsCompilerGenerated(constructor),
                _ => !member.IsImplicitlyDeclared && !IsCompilerGenerated(member),
            };

        private static bool IsCompilerGenerated(ISymbol member) =>
            member
                .GetAttributes()
                .Any(a =>
                    a.AttributeClass is { Name: "CompilerGeneratedAttribute" } attribute
                    && attribute.ContainingNamespace.ToDisplayString() == "System.Runtime.CompilerServices"
                );

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
            entries[id] = new LibraryApiEntry(
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
