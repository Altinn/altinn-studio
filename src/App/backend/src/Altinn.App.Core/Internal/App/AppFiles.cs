using System.Collections.Immutable;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Immutable in-memory snapshot of the static resource files an app ships with (config, models, options, ui and the
/// names of the custom frontend files), created by <see cref="AppFilesLoader"/>.
/// </summary>
/// <remarks>
/// Services read the current snapshot from <see cref="AppFilesAccessor.Current"/> every time they need it, because
/// in Development the snapshot is replaced when the files change on disk. File contents have any UTF-8 byte order mark
/// removed and every json file is known to parse. Callers own deserialization. File and folder names are matched
/// case-sensitively on every operating system, so an app behaves the same on a developer machine as in production.
/// </remarks>
internal sealed class AppFiles
{
    private static readonly ImmutableSortedDictionary<string, ReadOnlyMemory<byte>> _noFiles =
        ImmutableSortedDictionary.Create<string, ReadOnlyMemory<byte>>(StringComparer.Ordinal);

    private readonly ReadOnlyMemory<byte>? _applicationMetadata;
    private readonly ReadOnlyMemory<byte>? _xacmlPolicy;
    private readonly ReadOnlyMemory<byte>? _processDefinition;
    private readonly ImmutableSortedDictionary<string, ReadOnlyMemory<byte>> _textResources;
    private readonly ImmutableSortedDictionary<string, AppModelFiles> _models;
    private readonly ImmutableSortedDictionary<string, ReadOnlyMemory<byte>> _options;
    private readonly ImmutableArray<string> _customCssFileNames;
    private readonly ImmutableArray<string> _customJsFileNames;
    private readonly ImmutableArray<AppFileStamp> _stamps;

    /// <summary>
    /// A snapshot without any files, used until the files are loaded.
    /// </summary>
    public static AppFiles Empty { get; } = new();

    /// <param name="applicationMetadata">Contents of <c>config/applicationmetadata.json</c></param>
    /// <param name="xacmlPolicy">Contents of <c>config/authorization/policy.xml</c>, if the app has one</param>
    /// <param name="processDefinition">Contents of <c>config/process/process.bpmn</c>, if the app has one</param>
    /// <param name="frontendAssets">Contents of <c>config/assets.json</c>, if the app has one</param>
    /// <param name="textResources">Contents of <c>config/texts/resource.{language}.json</c> by language</param>
    /// <param name="models">The files in <c>models/</c> by data type id</param>
    /// <param name="options">Contents of <c>options/{optionId}.json</c> by option id</param>
    /// <param name="ui">The files in <c>ui/</c></param>
    /// <param name="customCssFileNames">File names in <c>wwwroot/custom-css/</c>, sorted ordinally</param>
    /// <param name="customJsFileNames">File names in <c>wwwroot/custom-js/</c>, sorted ordinally</param>
    /// <param name="hasLegacyIndexPage">Whether the app still has a <c>views/Home/Index.cshtml</c></param>
    /// <param name="stamps">Size and modification time of the files the snapshot was loaded from, sorted by path</param>
    public AppFiles(
        ReadOnlyMemory<byte>? applicationMetadata = null,
        ReadOnlyMemory<byte>? xacmlPolicy = null,
        ReadOnlyMemory<byte>? processDefinition = null,
        ReadOnlyMemory<byte>? frontendAssets = null,
        ImmutableSortedDictionary<string, ReadOnlyMemory<byte>>? textResources = null,
        ImmutableSortedDictionary<string, AppModelFiles>? models = null,
        ImmutableSortedDictionary<string, ReadOnlyMemory<byte>>? options = null,
        UiFiles? ui = null,
        ImmutableArray<string> customCssFileNames = default,
        ImmutableArray<string> customJsFileNames = default,
        bool hasLegacyIndexPage = false,
        ImmutableArray<AppFileStamp> stamps = default
    )
    {
        _applicationMetadata = applicationMetadata;
        _xacmlPolicy = xacmlPolicy;
        _processDefinition = processDefinition;
        FrontendAssets = frontendAssets;
        _textResources = textResources ?? _noFiles;
        _models = models ?? ImmutableSortedDictionary.Create<string, AppModelFiles>(StringComparer.Ordinal);
        _options = options ?? _noFiles;
        Ui = ui ?? UiFiles.Empty;
        _customCssFileNames = customCssFileNames.IsDefault ? [] : customCssFileNames;
        _customJsFileNames = customJsFileNames.IsDefault ? [] : customJsFileNames;
        HasLegacyIndexPage = hasLegacyIndexPage;
        _stamps = stamps.IsDefault ? [] : stamps;
    }

    /// <summary>
    /// Contents of <c>config/applicationmetadata.json</c>. <see cref="AppFilesLoader"/> refuses to load an app without it.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app files have not been loaded.</exception>
    public ReadOnlyMemory<byte> ApplicationMetadata =>
        _applicationMetadata
        ?? throw new ApplicationConfigException(
            "The app files have not been loaded, so config/applicationmetadata.json is not available. "
                + "AddAltinnAppServices in Program.cs loads them; a test that builds its own container must "
                + "register a loaded AppFilesAccessor."
        );

    /// <summary>
    /// Contents of <c>config/authorization/policy.xml</c>.
    /// </summary>
    /// <exception cref="FileNotFoundException">When the app has no policy file.</exception>
    public ReadOnlyMemory<byte> XacmlPolicy =>
        _xacmlPolicy ?? throw new FileNotFoundException("XACML file (config/authorization/policy.xml) not found");

    /// <summary>
    /// Contents of <c>config/process/process.bpmn</c>.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app has no process file.</exception>
    public ReadOnlyMemory<byte> ProcessDefinition =>
        _processDefinition
        ?? throw new ApplicationConfigException(
            "Unable to locate application process file (config/process/process.bpmn)"
        );

    /// <summary>
    /// Contents of <c>config/assets.json</c>, which lists extra stylesheets and scripts for the frontend.
    /// </summary>
    public ReadOnlyMemory<byte>? FrontendAssets { get; }

    /// <summary>
    /// The languages that have a <c>config/texts/resource.{language}.json</c>, sorted ordinally.
    /// </summary>
    public IEnumerable<string> GetTextResourceLanguages() => _textResources.Keys;

    /// <summary>
    /// Contents of <c>config/texts/resource.{language}.json</c>, or null when the app has no texts in the language.
    /// </summary>
    public ReadOnlyMemory<byte>? GetTextResource(string language) => Find(_textResources, language);

    /// <summary>
    /// The files in <c>models/</c> for a data type, or null when there are none. The file names in the folder start
    /// with the data type id.
    /// </summary>
    public AppModelFiles? GetModelFiles(string dataTypeId) =>
        _models.TryGetValue(dataTypeId, out var files) ? files : null;

    /// <summary>
    /// The option ids that have an <c>options/{optionId}.json</c>, sorted ordinally. Option lists provided by code
    /// (<c>IAppOptionsProvider</c>) are not included.
    /// </summary>
    public IEnumerable<string> GetOptionIds() => _options.Keys;

    /// <summary>
    /// Contents of <c>options/{optionId}.json</c>, or null when the app has no such file.
    /// </summary>
    public ReadOnlyMemory<byte>? GetOptions(string optionId) => Find(_options, optionId);

    /// <summary>
    /// The files in <c>ui/</c>.
    /// </summary>
    public UiFiles Ui { get; }

    /// <summary>
    /// File names in <c>wwwroot/custom-css/</c>, sorted ordinally.
    /// </summary>
    public IEnumerable<string> GetCustomCssFileNames() => _customCssFileNames;

    /// <summary>
    /// File names in <c>wwwroot/custom-js/</c>, sorted ordinally.
    /// </summary>
    public IEnumerable<string> GetCustomJsFileNames() => _customJsFileNames;

    /// <summary>
    /// True when the app still has a <c>views/Home/Index.cshtml</c> from before the index page was generated.
    /// </summary>
    public bool HasLegacyIndexPage { get; }

    /// <summary>
    /// Whether the files on disk in <paramref name="scan"/> are the ones this snapshot was loaded from, by path,
    /// size and modification time, so that <see cref="AppFilesPoller"/> can tell whether anything changed without
    /// reading the contents.
    /// </summary>
    public bool IsLoadedFrom(AppFilesScan scan) => scan.Stamps.AsSpan().SequenceEqual(_stamps.AsSpan());

    /// <summary>
    /// The file for a key, or null. A conditional expression would convert the null to an empty memory through the
    /// implicit array conversion, so this is a statement.
    /// </summary>
    internal static ReadOnlyMemory<byte>? Find(
        ImmutableSortedDictionary<string, ReadOnlyMemory<byte>> files,
        string key
    )
    {
        if (files.TryGetValue(key, out var bytes))
        {
            return bytes;
        }

        return null;
    }

    /// <summary>
    /// A copy of this snapshot with other contents for <c>config/applicationmetadata.json</c>.
    /// </summary>
    public AppFiles WithApplicationMetadata(ReadOnlyMemory<byte> applicationMetadata) =>
        new(
            applicationMetadata,
            _xacmlPolicy,
            _processDefinition,
            FrontendAssets,
            _textResources,
            _models,
            _options,
            Ui,
            _customCssFileNames,
            _customJsFileNames,
            HasLegacyIndexPage,
            _stamps
        );
}

/// <summary>
/// The files in <c>models/</c> for one data type.
/// </summary>
internal sealed class AppModelFiles
{
    /// <param name="jsonSchema">Contents of <c>models/{dataTypeId}.schema.json</c></param>
    /// <param name="xsdSchema">Contents of <c>models/{dataTypeId}.xsd</c></param>
    /// <param name="prefill">Contents of <c>models/{dataTypeId}.prefill.json</c></param>
    /// <param name="validationConfiguration">Contents of <c>models/{dataTypeId}.validation.json</c></param>
    /// <param name="calculationConfiguration">Contents of <c>models/{dataTypeId}.calculation.json</c></param>
    public AppModelFiles(
        ReadOnlyMemory<byte>? jsonSchema = null,
        ReadOnlyMemory<byte>? xsdSchema = null,
        ReadOnlyMemory<byte>? prefill = null,
        ReadOnlyMemory<byte>? validationConfiguration = null,
        ReadOnlyMemory<byte>? calculationConfiguration = null
    )
    {
        JsonSchema = jsonSchema;
        XsdSchema = xsdSchema;
        Prefill = prefill;
        ValidationConfiguration = validationConfiguration;
        CalculationConfiguration = calculationConfiguration;
    }

    /// <summary>
    /// Contents of <c>models/{dataTypeId}.schema.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? JsonSchema { get; }

    /// <summary>
    /// Contents of <c>models/{dataTypeId}.xsd</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? XsdSchema { get; }

    /// <summary>
    /// Contents of <c>models/{dataTypeId}.prefill.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? Prefill { get; }

    /// <summary>
    /// Contents of <c>models/{dataTypeId}.validation.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? ValidationConfiguration { get; }

    /// <summary>
    /// Contents of <c>models/{dataTypeId}.calculation.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? CalculationConfiguration { get; }
}

/// <summary>
/// The files in <c>ui/</c>.
/// </summary>
internal sealed class UiFiles
{
    private readonly ImmutableSortedDictionary<string, UiFolderFiles> _folders;

    /// <summary>
    /// A ui folder without any files.
    /// </summary>
    public static UiFiles Empty { get; } = new();

    /// <param name="settings">Contents of <c>ui/Settings.json</c></param>
    /// <param name="footer">Contents of <c>ui/footer.json</c></param>
    /// <param name="folders">The sub folders of <c>ui/</c> that have a <c>Settings.json</c> or a layout, by folder name</param>
    public UiFiles(
        ReadOnlyMemory<byte>? settings = null,
        ReadOnlyMemory<byte>? footer = null,
        ImmutableSortedDictionary<string, UiFolderFiles>? folders = null
    )
    {
        Settings = settings;
        Footer = footer;
        _folders = folders ?? ImmutableSortedDictionary.Create<string, UiFolderFiles>(StringComparer.Ordinal);
    }

    /// <summary>
    /// Contents of <c>ui/Settings.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? Settings { get; }

    /// <summary>
    /// Contents of <c>ui/footer.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? Footer { get; }

    /// <summary>
    /// The names of the sub folders of <c>ui/</c> that have a <c>Settings.json</c> or at least one layout, sorted
    /// ordinally.
    /// </summary>
    public IEnumerable<string> GetFolderIds() => _folders.Keys;

    /// <summary>
    /// The files in <c>ui/{folderId}/</c>, or null when the folder has no <c>Settings.json</c> and no layouts.
    /// </summary>
    public UiFolderFiles? GetFolder(string folderId) => _folders.TryGetValue(folderId, out var folder) ? folder : null;
}

/// <summary>
/// The files in one <c>ui/{folder}/</c>.
/// </summary>
internal sealed class UiFolderFiles
{
    private readonly ImmutableSortedDictionary<string, ReadOnlyMemory<byte>> _layouts;

    /// <param name="settings">Contents of <c>ui/{folder}/Settings.json</c></param>
    /// <param name="layouts">Contents of <c>ui/{folder}/layouts/{page}.json</c> by page name</param>
    public UiFolderFiles(
        ReadOnlyMemory<byte>? settings = null,
        ImmutableSortedDictionary<string, ReadOnlyMemory<byte>>? layouts = null
    )
    {
        Settings = settings;
        _layouts = layouts ?? ImmutableSortedDictionary.Create<string, ReadOnlyMemory<byte>>(StringComparer.Ordinal);
    }

    /// <summary>
    /// Contents of <c>ui/{folder}/Settings.json</c>.
    /// </summary>
    public ReadOnlyMemory<byte>? Settings { get; }

    /// <summary>
    /// The pages that have a <c>ui/{folder}/layouts/{page}.json</c>, sorted ordinally.
    /// </summary>
    public IEnumerable<string> GetLayoutPages() => _layouts.Keys;

    /// <summary>
    /// Contents of <c>ui/{folder}/layouts/{page}.json</c>, or null when the folder has no such page.
    /// </summary>
    public ReadOnlyMemory<byte>? GetLayout(string page) => AppFiles.Find(_layouts, page);
}

/// <summary>
/// Size and modification time of one app resource file, used to detect changes on disk without reading the contents.
/// </summary>
/// <param name="RelativePath">Path relative to the app folder with '/' separators</param>
/// <param name="Length">File size in bytes</param>
/// <param name="LastWriteTimeUtcTicks">Last write time as UTC ticks</param>
internal readonly record struct AppFileStamp(string RelativePath, long Length, long LastWriteTimeUtcTicks);

/// <summary>
/// Holds the current <see cref="AppFiles"/> snapshot. Registered as a singleton, so services that live for the whole
/// app must read <see cref="Current"/> when they need the files rather than keep a snapshot, which in Development
/// is replaced when the files change on disk.
/// </summary>
internal sealed class AppFilesAccessor
{
    private volatile AppFiles _current;

    /// <summary>
    /// Starts with <see cref="AppFiles.Empty"/>, until <see cref="Update"/> is called with the loaded files.
    /// </summary>
    public AppFilesAccessor()
        : this(AppFiles.Empty) { }

    public AppFilesAccessor(AppFiles initial)
    {
        _current = initial;
    }

    /// <summary>
    /// The current snapshot of the app files.
    /// </summary>
    public AppFiles Current => _current;

    /// <summary>
    /// Replaces the current snapshot.
    /// </summary>
    public void Update(AppFiles files)
    {
        ArgumentNullException.ThrowIfNull(files);
        _current = files;
    }
}
