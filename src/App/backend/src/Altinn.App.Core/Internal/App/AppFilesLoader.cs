using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Text.Json;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Builds an <see cref="AppFiles"/> snapshot from the app folder, whose layout is fixed: the folder and file names
/// below are the ones Studio creates. <see cref="Scan"/> only reads directory metadata, so that
/// <see cref="AppFilesPoller"/> can cheaply tell whether a reload is needed; <see cref="Load(AppFilesScan, CancellationToken)"/>
/// reads and validates the contents.
/// </summary>
internal static class AppFilesLoader
{
    // Paths relative to the app folder, with '/' separators
    internal const string ConfigFolder = "config";
    internal const string ApplicationMetadataPath = "config/applicationmetadata.json";
    internal const string XacmlPolicyPath = "config/authorization/policy.xml";
    internal const string ProcessDefinitionPath = "config/process/process.bpmn";
    internal const string FrontendAssetsPath = "config/assets.json";
    internal const string TextsFolder = "config/texts";
    internal const string ModelsFolder = "models";
    internal const string OptionsFolder = "options";
    internal const string UiFolder = "ui";
    internal const string UiSettingsFileName = "Settings.json";
    internal const string FooterFileName = "footer.json";
    internal const string LayoutsFolderName = "layouts";
    internal const string CustomCssFolder = "wwwroot/custom-css";
    internal const string CustomJsFolder = "wwwroot/custom-js";
    internal const string LegacyIndexPagePath = "views/Home/Index.cshtml";

    private const int MaxParallelReads = 8;
    private const string JsonExtension = ".json";
    private const string TextResourcePrefix = "resource.";

    private static readonly byte[] _utf8Bom = [0xEF, 0xBB, 0xBF];

    private static readonly JsonDocumentOptions _jsonValidationOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    /// <summary>
    /// Reads and validates the app files.
    /// </summary>
    /// <param name="basePath">Absolute path of the app folder, normally the content root of the host</param>
    /// <param name="cancellationToken">Cancels the file reads</param>
    /// <exception cref="ApplicationConfigException">With every problem found, when the app files cannot be loaded.</exception>
    public static Task<AppFiles> Load(string basePath, CancellationToken cancellationToken) =>
        Load(Scan(basePath), cancellationToken);

    /// <summary>
    /// Lists the app files with their size and modification time, without reading the contents. There is no
    /// asynchronous directory enumeration in .NET, so this is synchronous.
    /// </summary>
    /// <param name="basePath">Absolute path of the app folder, normally the content root of the host</param>
    public static AppFilesScan Scan(string basePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(basePath);
        var scanner = new Scanner(Path.GetFullPath(basePath));

        scanner.AddFile(ApplicationMetadataPath, AppFileKind.ApplicationMetadata);
        scanner.AddFile(XacmlPolicyPath, AppFileKind.XacmlPolicy);
        scanner.AddFile(ProcessDefinitionPath, AppFileKind.ProcessDefinition);
        scanner.AddFile(FrontendAssetsPath, AppFileKind.FrontendAssets);

        foreach (var name in scanner.FileNames(TextsFolder))
        {
            if (
                name.Length > TextResourcePrefix.Length + JsonExtension.Length
                && name.StartsWith(TextResourcePrefix, StringComparison.Ordinal)
                && name.EndsWith(JsonExtension, StringComparison.Ordinal)
            )
            {
                scanner.AddFile(
                    $"{TextsFolder}/{name}",
                    AppFileKind.TextResource,
                    name[TextResourcePrefix.Length..^JsonExtension.Length]
                );
            }
        }

        foreach (var name in scanner.FileNames(ModelsFolder))
        {
            if (ClassifyModelFile(name) is ({ } kind, { } dataTypeId))
            {
                scanner.AddFile($"{ModelsFolder}/{name}", kind, dataTypeId);
            }
        }

        foreach (var name in scanner.FileNames(OptionsFolder))
        {
            if (JsonName(name) is { } optionId)
            {
                scanner.AddFile($"{OptionsFolder}/{name}", AppFileKind.Options, optionId);
            }
        }

        scanner.AddFile($"{UiFolder}/{UiSettingsFileName}", AppFileKind.UiSettings);
        scanner.AddFile($"{UiFolder}/{FooterFileName}", AppFileKind.Footer);
        foreach (var folder in scanner.DirectoryNames(UiFolder))
        {
            scanner.AddFile($"{UiFolder}/{folder}/{UiSettingsFileName}", AppFileKind.UiFolderSettings, folder);

            var layoutsPath = $"{UiFolder}/{folder}/{LayoutsFolderName}";
            foreach (var name in scanner.FileNames(layoutsPath))
            {
                if (JsonName(name) is { } page)
                {
                    scanner.AddFile($"{layoutsPath}/{name}", AppFileKind.Layout, folder, page);
                }
            }
        }

        foreach (var name in scanner.FileNames(CustomCssFolder))
        {
            scanner.AddFile($"{CustomCssFolder}/{name}", AppFileKind.CustomCss, name);
        }

        foreach (var name in scanner.FileNames(CustomJsFolder))
        {
            scanner.AddFile($"{CustomJsFolder}/{name}", AppFileKind.CustomJs, name);
        }

        scanner.AddFile(LegacyIndexPagePath, AppFileKind.LegacyIndexPage);

        return scanner.Build();
    }

    /// <summary>
    /// Reads the contents of the scanned files, validates that every json file parses and that the application
    /// metadata file exists, and builds the snapshot.
    /// </summary>
    /// <exception cref="ApplicationConfigException">With every problem found, when the app files cannot be loaded.</exception>
    public static async Task<AppFiles> Load(AppFilesScan scan, CancellationToken cancellationToken)
    {
        var files = scan.Files;
        var contents = new ReadOnlyMemory<byte>[files.Length];
        var errors = new ConcurrentBag<string>();

        await Parallel.ForEachAsync(
            Enumerable.Range(0, files.Length),
            new ParallelOptions { MaxDegreeOfParallelism = MaxParallelReads, CancellationToken = cancellationToken },
            async (i, ct) =>
            {
                var file = files[i];
                if (!HasContents(file.Kind))
                {
                    return;
                }

                ReadOnlyMemory<byte> bytes;
                try
                {
                    bytes = WithoutBom(
                        await File.ReadAllBytesAsync(Path.Join(scan.BasePath, file.Stamp.RelativePath), ct)
                    );
                }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException)
                {
                    errors.Add($"{file.Stamp.RelativePath}: {e.Message}");
                    return;
                }

                if (IsJson(file.Kind))
                {
                    try
                    {
                        using var _ = JsonDocument.Parse(bytes, _jsonValidationOptions);
                    }
                    catch (JsonException e)
                    {
                        errors.Add($"{file.Stamp.RelativePath}: {e.Message}");
                        return;
                    }
                }

                contents[i] = bytes;
            }
        );

        if (!files.Any(f => f.Kind == AppFileKind.ApplicationMetadata))
        {
            errors.Add($"{ApplicationMetadataPath}: the application metadata file is missing");
        }

        if (!errors.IsEmpty)
        {
            var sortedErrors = errors.ToArray();
            Array.Sort(sortedErrors, StringComparer.Ordinal);
            throw new ApplicationConfigException(
                "The app files cannot be loaded. Fix the following and restart the app:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, sortedErrors.Select(e => $" - {e}"))
            );
        }

        return Build(scan, contents);
    }

    private static AppFiles Build(AppFilesScan scan, ReadOnlyMemory<byte>[] contents)
    {
        var files = scan.Files;
        ReadOnlyMemory<byte>? applicationMetadata = null;
        ReadOnlyMemory<byte>? xacmlPolicy = null;
        ReadOnlyMemory<byte>? processDefinition = null;
        ReadOnlyMemory<byte>? frontendAssets = null;
        ReadOnlyMemory<byte>? uiSettings = null;
        ReadOnlyMemory<byte>? footer = null;
        bool hasLegacyIndexPage = false;
        var texts = ImmutableSortedDictionary.CreateBuilder<string, ReadOnlyMemory<byte>>(StringComparer.Ordinal);
        var options = ImmutableSortedDictionary.CreateBuilder<string, ReadOnlyMemory<byte>>(StringComparer.Ordinal);
        var models = new SortedDictionary<string, ModelBuilder>(StringComparer.Ordinal);
        var uiFolders = new SortedDictionary<string, UiFolderBuilder>(StringComparer.Ordinal);
        var customCss = ImmutableArray.CreateBuilder<string>();
        var customJs = ImmutableArray.CreateBuilder<string>();

        for (int i = 0; i < files.Length; i++)
        {
            var file = files[i];
            var content = contents[i];
            switch (file.Kind)
            {
                case AppFileKind.ApplicationMetadata:
                    applicationMetadata = content;
                    break;
                case AppFileKind.XacmlPolicy:
                    xacmlPolicy = content;
                    break;
                case AppFileKind.ProcessDefinition:
                    processDefinition = content;
                    break;
                case AppFileKind.FrontendAssets:
                    frontendAssets = content;
                    break;
                case AppFileKind.TextResource:
                    texts[file.Key] = content;
                    break;
                case AppFileKind.ModelJsonSchema:
                    Model(file.Key).JsonSchema = content;
                    break;
                case AppFileKind.ModelXsd:
                    Model(file.Key).XsdSchema = content;
                    break;
                case AppFileKind.ModelPrefill:
                    Model(file.Key).Prefill = content;
                    break;
                case AppFileKind.ModelValidation:
                    Model(file.Key).ValidationConfiguration = content;
                    break;
                case AppFileKind.ModelCalculation:
                    Model(file.Key).CalculationConfiguration = content;
                    break;
                case AppFileKind.Options:
                    options[file.Key] = content;
                    break;
                case AppFileKind.UiSettings:
                    uiSettings = content;
                    break;
                case AppFileKind.Footer:
                    footer = content;
                    break;
                case AppFileKind.UiFolderSettings:
                    UiFolder(file.Key).Settings = content;
                    break;
                case AppFileKind.Layout:
                    UiFolder(file.Key).Layouts[file.Page] = content;
                    break;
                case AppFileKind.CustomCss:
                    customCss.Add(file.Key);
                    break;
                case AppFileKind.CustomJs:
                    customJs.Add(file.Key);
                    break;
                case AppFileKind.LegacyIndexPage:
                    hasLegacyIndexPage = true;
                    break;
                default:
                    throw new InvalidOperationException($"Unknown app file kind {file.Kind}");
            }
        }

        // Files are sorted by path, so the css and js names are already in ordinal order
        return new AppFiles(
            applicationMetadata,
            xacmlPolicy,
            processDefinition,
            frontendAssets,
            texts.ToImmutable(),
            models.ToImmutableSortedDictionary(m => m.Key, m => m.Value.Build(), StringComparer.Ordinal),
            options.ToImmutable(),
            new UiFiles(
                uiSettings,
                footer,
                uiFolders.ToImmutableSortedDictionary(f => f.Key, f => f.Value.Build(), StringComparer.Ordinal)
            ),
            customCss.ToImmutable(),
            customJs.ToImmutable(),
            hasLegacyIndexPage,
            scan.Stamps
        );

        ModelBuilder Model(string dataTypeId)
        {
            if (!models.TryGetValue(dataTypeId, out var builder))
            {
                builder = new ModelBuilder();
                models[dataTypeId] = builder;
            }

            return builder;
        }

        UiFolderBuilder UiFolder(string folder)
        {
            if (!uiFolders.TryGetValue(folder, out var builder))
            {
                builder = new UiFolderBuilder();
                uiFolders[folder] = builder;
            }

            return builder;
        }
    }

    /// <summary>
    /// The kind of a file in the models folder and the data type id it belongs to, from its suffix.
    /// </summary>
    private static (AppFileKind? Kind, string? DataTypeId) ClassifyModelFile(string name)
    {
        ReadOnlySpan<(string Suffix, AppFileKind Kind)> suffixes =
        [
            (".schema.json", AppFileKind.ModelJsonSchema),
            (".prefill.json", AppFileKind.ModelPrefill),
            (".validation.json", AppFileKind.ModelValidation),
            (".calculation.json", AppFileKind.ModelCalculation),
            (".xsd", AppFileKind.ModelXsd),
        ];
        foreach (var (suffix, kind) in suffixes)
        {
            if (name.Length > suffix.Length && name.EndsWith(suffix, StringComparison.Ordinal))
            {
                return (kind, name[..^suffix.Length]);
            }
        }

        return (null, null);
    }

    /// <summary>
    /// The name without the <c>.json</c> extension, or null for other files.
    /// </summary>
    private static string? JsonName(string fileName) =>
        fileName.Length > JsonExtension.Length && fileName.EndsWith(JsonExtension, StringComparison.Ordinal)
            ? fileName[..^JsonExtension.Length]
            : null;

    private static bool HasContents(AppFileKind kind) =>
        kind is not (AppFileKind.CustomCss or AppFileKind.CustomJs or AppFileKind.LegacyIndexPage);

    private static bool IsJson(AppFileKind kind) =>
        kind is not (AppFileKind.XacmlPolicy or AppFileKind.ProcessDefinition or AppFileKind.ModelXsd);

    /// <summary>
    /// Skips a leading UTF-8 byte order mark without copying.
    /// </summary>
    private static ReadOnlyMemory<byte> WithoutBom(byte[] bytes) =>
        bytes.AsSpan().StartsWith(_utf8Bom) ? bytes.AsMemory(_utf8Bom.Length) : bytes;

    /// <summary>
    /// Finds files by listing their folders and matching every path segment ordinally, instead of asking the file
    /// system for a path, so that a name that differs only in case is not found on Windows and macOS either. An app
    /// then behaves the same on a developer's machine as in the Linux container it is deployed to.
    /// </summary>
    private sealed class Scanner(string basePath)
    {
        private readonly List<ScannedFile> _files = [];
        private readonly Dictionary<string, Listing?> _listings = new(StringComparer.Ordinal);

        public void AddFile(string relativePath, AppFileKind kind, string key = "", string page = "")
        {
            var (parent, name) = Split(relativePath);
            if (GetListing(parent)?.Files.GetValueOrDefault(name) is { } info)
            {
                _files.Add(
                    new ScannedFile(
                        new AppFileStamp(relativePath, info.Length, info.LastWriteTimeUtc.Ticks),
                        kind,
                        key,
                        page
                    )
                );
            }
        }

        public IEnumerable<string> FileNames(string relativeDirectory) =>
            GetListing(relativeDirectory) is { } listing ? listing.Files.Keys : [];

        public IEnumerable<string> DirectoryNames(string relativeDirectory) =>
            GetListing(relativeDirectory) is { } listing ? listing.Directories.Keys : [];

        public AppFilesScan Build()
        {
            _files.Sort((a, b) => string.CompareOrdinal(a.Stamp.RelativePath, b.Stamp.RelativePath));
            return new AppFilesScan(basePath, [.. _files]);
        }

        /// <summary>
        /// The entries of a folder below the app folder, or null when the folder does not exist with that exact name.
        /// </summary>
        private Listing? GetListing(string relativeDirectory)
        {
            if (_listings.TryGetValue(relativeDirectory, out var listing))
            {
                return listing;
            }

            DirectoryInfo? directory;
            if (relativeDirectory.Length == 0)
            {
                var root = new DirectoryInfo(basePath);
                directory = root.Exists ? root : null;
            }
            else
            {
                var (parent, name) = Split(relativeDirectory);
                directory = GetListing(parent)?.Directories.GetValueOrDefault(name);
            }

            listing = directory is null ? null : Listing.Of(directory);
            _listings[relativeDirectory] = listing;
            return listing;
        }

        private static (string Parent, string Name) Split(string relativePath)
        {
            int slash = relativePath.LastIndexOf('/');
            return slash < 0 ? ("", relativePath) : (relativePath[..slash], relativePath[(slash + 1)..]);
        }

        private sealed class Listing
        {
            public Dictionary<string, FileInfo> Files { get; } = new(StringComparer.Ordinal);
            public Dictionary<string, DirectoryInfo> Directories { get; } = new(StringComparer.Ordinal);

            public static Listing Of(DirectoryInfo directory)
            {
                var listing = new Listing();
                foreach (var entry in directory.EnumerateFileSystemInfos())
                {
                    switch (entry)
                    {
                        case FileInfo file:
                            listing.Files[file.Name] = file;
                            break;
                        case DirectoryInfo subDirectory:
                            listing.Directories[subDirectory.Name] = subDirectory;
                            break;
                    }
                }

                return listing;
            }
        }
    }

    private sealed class ModelBuilder
    {
        public ReadOnlyMemory<byte>? JsonSchema { get; set; }
        public ReadOnlyMemory<byte>? XsdSchema { get; set; }
        public ReadOnlyMemory<byte>? Prefill { get; set; }
        public ReadOnlyMemory<byte>? ValidationConfiguration { get; set; }
        public ReadOnlyMemory<byte>? CalculationConfiguration { get; set; }

        public AppModelFiles Build() =>
            new(JsonSchema, XsdSchema, Prefill, ValidationConfiguration, CalculationConfiguration);
    }

    private sealed class UiFolderBuilder
    {
        public ReadOnlyMemory<byte>? Settings { get; set; }
        public ImmutableSortedDictionary<string, ReadOnlyMemory<byte>>.Builder Layouts { get; } =
            ImmutableSortedDictionary.CreateBuilder<string, ReadOnlyMemory<byte>>(StringComparer.Ordinal);

        public UiFolderFiles Build() => new(Settings, Layouts.ToImmutable());
    }
}

/// <summary>
/// The result of <see cref="AppFilesLoader.Scan"/>: which app files exist on disk, without their contents.
/// </summary>
internal sealed class AppFilesScan
{
    internal AppFilesScan(string basePath, ImmutableArray<ScannedFile> files)
    {
        BasePath = basePath;
        Files = files;
        Stamps = [.. files.Select(f => f.Stamp)];
    }

    /// <summary>
    /// Absolute path of the app folder the relative paths are resolved against.
    /// </summary>
    internal string BasePath { get; }

    internal ImmutableArray<ScannedFile> Files { get; }

    /// <summary>
    /// Path, size and modification time of every scanned file, sorted by path.
    /// </summary>
    public ImmutableArray<AppFileStamp> Stamps { get; }
}

internal enum AppFileKind
{
    ApplicationMetadata,
    XacmlPolicy,
    ProcessDefinition,
    FrontendAssets,
    TextResource,
    ModelJsonSchema,
    ModelXsd,
    ModelPrefill,
    ModelValidation,
    ModelCalculation,
    Options,
    UiSettings,
    Footer,
    UiFolderSettings,
    Layout,
    CustomCss,
    CustomJs,
    LegacyIndexPage,
}

/// <param name="Stamp">Path, size and modification time</param>
/// <param name="Kind">What the file is</param>
/// <param name="Key">Language, data type id, option id, ui folder or custom file name, depending on the kind</param>
/// <param name="Page">The layout page, for <see cref="AppFileKind.Layout"/></param>
internal readonly record struct ScannedFile(AppFileStamp Stamp, AppFileKind Kind, string Key, string Page);
