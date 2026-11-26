using System.Collections.Immutable;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>
/// Finds the third-party package assemblies that an app compiles against and that reference the app library, and
/// reads which of its types and members they reference.
/// </summary>
/// <remarks>
/// A package is compiled against one app library version, so its use is invisible in the app's source but breaks
/// when the app moves to a version without what it references. IL references carry names and signatures but are not
/// bound, so members are recorded by name.
/// </remarks>
internal static class BinaryReferences
{
    // Packages that cannot be built on the app library. The app library's own assemblies are skipped by assembly name,
    // whatever package carries them, such as a preview build in Altinn.App.Api.Experimental, so that a third-party
    // package named Altinn.App.Something is still read.
    private static readonly string[] s_skippedPrefixes = ["Microsoft.", "System.", "runtime."];

    /// <summary>
    /// The version of the app library package that a restored project uses: <c>Altinn.App.Core</c>, or
    /// <c>Altinn.App.Api</c> for v6 and older, which have no Core. <c>null</c> when it uses neither, such as with a
    /// project reference to the app library's source or a preview build in <c>Altinn.App.Core.Experimental</c>, whose
    /// versions the published packages do not have.
    /// </summary>
    public static string? LibraryPackageVersion(string projectDir)
    {
        string assetsFile = Path.Join(projectDir, "obj", "project.assets.json");
        if (!File.Exists(assetsFile))
        {
            return null;
        }

        using JsonDocument assets = JsonDocument.Parse(File.ReadAllBytes(assetsFile));
        var versions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (JsonProperty target in assets.RootElement.GetProperty("targets").EnumerateObject())
        {
            foreach (JsonProperty library in target.Value.EnumerateObject())
            {
                int slash = library.Name.IndexOf('/', StringComparison.Ordinal);
                if (slash > 0 && library.Value.GetProperty("type").GetString() == "package")
                {
                    versions.TryAdd(library.Name[..slash], library.Name[(slash + 1)..]);
                }
            }
        }

        return versions.GetValueOrDefault("Altinn.App.Core") ?? versions.GetValueOrDefault("Altinn.App.Api");
    }

    /// <summary>The package assemblies in a restored project's graph that reference the app library.</summary>
    public static List<PackageUse> Scan(string projectDir)
    {
        string assetsFile = Path.Join(projectDir, "obj", "project.assets.json");
        if (!File.Exists(assetsFile))
        {
            return [];
        }

        using JsonDocument assets = JsonDocument.Parse(File.ReadAllBytes(assetsFile));
        JsonElement root = assets.RootElement;
        List<string> packageFolders = [.. root.GetProperty("packageFolders").EnumerateObject().Select(p => p.Name)];
        JsonElement libraries = root.GetProperty("libraries");
        var result = new List<PackageUse>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (JsonProperty target in root.GetProperty("targets").EnumerateObject())
        {
            foreach (JsonProperty library in target.Value.EnumerateObject())
            {
                if (library.Value.GetProperty("type").GetString() != "package" || !seen.Add(library.Name))
                {
                    continue;
                }

                int slash = library.Name.IndexOf('/', StringComparison.Ordinal);
                string name = library.Name[..slash];
                string version = library.Name[(slash + 1)..];
                if (s_skippedPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                string? libraryPath = libraries.GetProperty(library.Name).GetProperty("path").GetString();
                foreach (string file in Assemblies(library.Value))
                {
                    if (libraryPath is null || LibrarySymbols.IsLibraryAssembly(Path.GetFileNameWithoutExtension(file)))
                    {
                        continue;
                    }

                    string? path = packageFolders
                        .Select(folder => Path.Join(folder, libraryPath, file))
                        .FirstOrDefault(File.Exists);
                    if (path is not null && Read(path) is { } references)
                    {
                        result.Add(new PackageUse(name, version, Path.GetFileNameWithoutExtension(path), references));
                    }
                }
            }
        }

        return result;
    }

    /// <summary>
    /// A package's assemblies. The runtime ones come first, including those for one platform only, since a reference
    /// assembly, under <c>ref/</c>, has no method bodies and so does not show what the package's code calls. One
    /// copy of each assembly is read.
    /// </summary>
    private static List<string> Assemblies(JsonElement library)
    {
        var runtime = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (library.TryGetProperty("runtime", out JsonElement files))
        {
            AddDlls(runtime, files.EnumerateObject().Select(file => file.Name));
        }

        if (library.TryGetProperty("runtimeTargets", out JsonElement targets))
        {
            AddDlls(
                runtime,
                targets
                    .EnumerateObject()
                    .Where(file =>
                        file.Value.TryGetProperty("assetType", out JsonElement type) && type.GetString() == "runtime"
                    )
                    .Select(file => file.Name)
            );
        }

        if (runtime.Count == 0 && library.TryGetProperty("compile", out JsonElement compile))
        {
            AddDlls(runtime, compile.EnumerateObject().Select(file => file.Name));
        }

        return [.. runtime.Values];
    }

    private static void AddDlls(Dictionary<string, string> byName, IEnumerable<string> files)
    {
        foreach (string file in files.Where(f => f.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)))
        {
            byName.TryAdd(Path.GetFileName(file), file);
        }
    }

    /// <summary>What an assembly references of the app library, or <c>null</c> when it references none of it.</summary>
    public static List<PackageReferenceUse>? Read(string assemblyPath)
    {
        using FileStream stream = File.OpenRead(assemblyPath);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata)
        {
            return null;
        }

        MetadataReader reader = pe.GetMetadataReader();
        HashSet<EntityHandle> libraryAssemblies =
        [
            .. reader
                .AssemblyReferences.Where(handle =>
                    LibrarySymbols.IsLibraryAssembly(reader.GetString(reader.GetAssemblyReference(handle).Name))
                )
                .Select(handle => (EntityHandle)handle),
        ];
        if (libraryAssemblies.Count == 0)
        {
            return null;
        }

        var names = new TypeNames(reader, libraryAssemblies);
        var references = new HashSet<PackageReferenceUse>();
        foreach (TypeReferenceHandle handle in reader.TypeReferences)
        {
            if (names.Of(handle) is { } name)
            {
                references.Add(new PackageReferenceUse($"T:{name}", UseKinds.Type));
            }
        }

        foreach (MemberReferenceHandle handle in reader.MemberReferences)
        {
            MemberReference member = reader.GetMemberReference(handle);
            if (names.Of(member.Parent) is not { } typeName)
            {
                continue;
            }

            // Documentation comment IDs write a constructor's name as #ctor.
            string name = reader.GetString(member.Name).Replace('.', '#');
            bool isAccessor =
                name.StartsWith("get_", StringComparison.Ordinal) || name.StartsWith("set_", StringComparison.Ordinal);
            references.Add(
                member.GetKind() == MemberReferenceKind.Field ? new($"F:{typeName}.{name}", UseKinds.Access)
                : isAccessor ? new($"P:{typeName}.{name[4..]}", UseKinds.Access)
                : name == "#ctor" ? new($"M:{typeName}.{name}", UseKinds.Construct)
                : new($"M:{typeName}.{name}", UseKinds.Call)
            );
        }

        foreach (TypeDefinitionHandle handle in reader.TypeDefinitions)
        {
            TypeDefinition type = reader.GetTypeDefinition(handle);
            if (names.Of(type.BaseType) is { } baseName)
            {
                references.Add(new PackageReferenceUse($"T:{baseName}", UseKinds.Inherit));
            }

            foreach (InterfaceImplementationHandle implementation in type.GetInterfaceImplementations())
            {
                if (names.Of(reader.GetInterfaceImplementation(implementation).Interface) is { } interfaceName)
                {
                    references.Add(new PackageReferenceUse($"T:{interfaceName}", UseKinds.Implement));
                }
            }
        }

        return
        [
            .. references.OrderBy(r => r.Symbol, StringComparer.Ordinal).ThenBy(r => r.Kind, StringComparer.Ordinal),
        ];
    }

    /// <summary>Names the app library types that references point to, as documentation comment IDs write them.</summary>
    private sealed class TypeNames(MetadataReader reader, HashSet<EntityHandle> libraryAssemblies)
        : ISignatureTypeProvider<string?, object?>
    {
        public string? Of(EntityHandle handle) =>
            handle.Kind switch
            {
                HandleKind.TypeReference => Of((TypeReferenceHandle)handle),
                // A generic instantiation, such as IFormDataValidator<MyModel>, names its generic type.
                HandleKind.TypeSpecification => reader
                    .GetTypeSpecification((TypeSpecificationHandle)handle)
                    .DecodeSignature(this, null),
                _ => null,
            };

        public string? Of(TypeReferenceHandle handle)
        {
            TypeReference type = reader.GetTypeReference(handle);
            string name = reader.GetString(type.Name);
            if (type.ResolutionScope.Kind == HandleKind.TypeReference)
            {
                return Of((TypeReferenceHandle)type.ResolutionScope) is { } outer ? $"{outer}.{name}" : null;
            }

            if (!libraryAssemblies.Contains(type.ResolutionScope))
            {
                return null;
            }

            string ns = reader.GetString(type.Namespace);
            return ns.Length == 0 ? name : $"{ns}.{name}";
        }

        public string? GetGenericInstantiation(string? genericType, ImmutableArray<string?> typeArguments) =>
            genericType;

        public string? GetTypeFromReference(MetadataReader metadata, TypeReferenceHandle handle, byte rawTypeKind) =>
            Of(handle);

        public string? GetTypeFromSpecification(
            MetadataReader metadata,
            object? genericContext,
            TypeSpecificationHandle handle,
            byte rawTypeKind
        ) => Of(handle);

        public string? GetTypeFromDefinition(MetadataReader metadata, TypeDefinitionHandle handle, byte rawTypeKind) =>
            null;

        public string? GetArrayType(string? elementType, ArrayShape shape) => null;

        public string? GetByReferenceType(string? elementType) => null;

        public string? GetFunctionPointerType(MethodSignature<string?> signature) => null;

        public string? GetGenericMethodParameter(object? genericContext, int index) => null;

        public string? GetGenericTypeParameter(object? genericContext, int index) => null;

        public string? GetModifiedType(string? modifier, string? unmodifiedType, bool isRequired) => unmodifiedType;

        public string? GetPinnedType(string? elementType) => null;

        public string? GetPointerType(string? elementType) => null;

        public string? GetPrimitiveType(PrimitiveTypeCode typeCode) => null;

        public string? GetSZArrayType(string? elementType) => null;
    }
}
