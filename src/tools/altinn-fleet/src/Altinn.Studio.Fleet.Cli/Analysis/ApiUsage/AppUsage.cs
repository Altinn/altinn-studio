using System.Text.Json.Serialization;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>What one app uses of the app library, or why that could not be found out.</summary>
/// <param name="Project">The app's project, relative to the app's folder.</param>
/// <param name="LibraryVersion">The assembly version of the app library the app compiles against.</param>
/// <param name="Failure">Why the app could not be analyzed at all, or <c>null</c>.</param>
/// <param name="RestoreError">What <c>dotnet restore</c> wrote when it failed, or <c>null</c>.</param>
/// <param name="LoadFailures">What MSBuild reported while it loaded the projects.</param>
/// <param name="CompileErrors">How many errors the compilation has. Uses in code that does not bind are missing.</param>
/// <param name="SampleErrors">The first of those errors.</param>
/// <param name="TestProjects">The app's test projects that were analyzed, relative to the app's folder.</param>
/// <param name="Uses">The app library symbols the app's code binds to.</param>
/// <param name="Packages">The third-party packages the app uses that reference the app library.</param>
internal sealed record AppUsage(
    string? Project,
    string? LibraryVersion,
    string? Failure,
    string? RestoreError,
    IReadOnlyList<string> LoadFailures,
    int CompileErrors,
    IReadOnlyList<string> SampleErrors,
    IReadOnlyList<string> TestProjects,
    IReadOnlyList<SymbolUse> Uses,
    IReadOnlyList<PackageUse> Packages
)
{
    public static AppUsage Failed(string failure, string? project = null, string? restoreError = null) =>
        new(project, null, failure, restoreError, [], 0, [], [], [], []);
}

/// <summary>An app library symbol that the app's code binds to.</summary>
/// <param name="Symbol">The symbol's documentation comment ID, such as <c>M:Ns.Type.Method(System.String)</c>.</param>
/// <param name="Assembly">The app library assembly that declares it.</param>
/// <param name="Kind">How the code uses it. See <see cref="UseKinds"/>.</param>
/// <param name="Source">Whose code uses it. See <see cref="UseSources"/>.</param>
/// <param name="Count">How many times.</param>
/// <param name="FirstLocation">The first place, as a path relative to the app's folder and a line.</param>
internal sealed record SymbolUse(
    string Symbol,
    string Assembly,
    string Kind,
    string Source,
    int Count,
    string FirstLocation
);

/// <summary>A third-party package assembly that references the app library, and what it references.</summary>
internal sealed record PackageUse(
    string Package,
    string Version,
    string Assembly,
    IReadOnlyList<PackageReferenceUse> References
);

/// <summary>
/// A type or member a package assembly references. IL references are not bound, so a member is named without its
/// parameters, as in <c>M:Ns.Type.Method</c>, and stands for every overload of that name.
/// </summary>
internal sealed record PackageReferenceUse(string Symbol, string Kind);

/// <summary>How code uses a symbol.</summary>
internal static class UseKinds
{
    public const string Type = "type";
    public const string Call = "call";
    public const string Construct = "construct";
    public const string Access = "access";
    public const string Event = "event";
    public const string Operator = "operator";
    public const string Conversion = "conversion";
    public const string Attribute = "attribute";
    public const string Implement = "implement";
    public const string Override = "override";
    public const string Inherit = "inherit";
}

/// <summary>Whose code uses a symbol.</summary>
internal static class UseSources
{
    /// <summary>The app's own code, in its project and the library projects it references.</summary>
    public const string App = "app";

    /// <summary>Code that source generators write into the app's compilation, such as the app library's own.</summary>
    public const string Generated = "generated";

    /// <summary>The app's test projects.</summary>
    public const string Test = "test";
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(AppUsage))]
internal sealed partial class ApiUsageJsonContext : JsonSerializerContext;
