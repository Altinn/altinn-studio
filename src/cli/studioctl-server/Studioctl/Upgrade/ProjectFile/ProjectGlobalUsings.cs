using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.ProjectFile;

/// <summary>
/// The namespaces a project imports in every source file: the SDK's implicit usings when the project
/// enables them, adjusted by the project's own <c>Using</c> items in document order. Only the project
/// file itself is read; a <c>Directory.Build.props</c> is not part of an Altinn app.
/// </summary>
internal static class ProjectGlobalUsings
{
    // Microsoft.NET.Sdk (Microsoft.NET.Sdk.CSharp.props)
    private static readonly string[] _sdkNamespaces =
    [
        "System",
        "System.Collections.Generic",
        "System.IO",
        "System.Linq",
        "System.Net.Http",
        "System.Threading",
        "System.Threading.Tasks",
    ];

    // Microsoft.NET.Sdk.Web adds these on top of the base set.
    private static readonly string[] _webSdkNamespaces =
    [
        "System.Net.Http.Json",
        "Microsoft.AspNetCore.Builder",
        "Microsoft.AspNetCore.Hosting",
        "Microsoft.AspNetCore.Http",
        "Microsoft.AspNetCore.Routing",
        "Microsoft.Extensions.Configuration",
        "Microsoft.Extensions.DependencyInjection",
        "Microsoft.Extensions.Hosting",
        "Microsoft.Extensions.Logging",
    ];

    // Microsoft.NET.Sdk.Worker adds these on top of the base set.
    private static readonly string[] _workerSdkNamespaces =
    [
        "Microsoft.Extensions.Configuration",
        "Microsoft.Extensions.DependencyInjection",
        "Microsoft.Extensions.Hosting",
        "Microsoft.Extensions.Logging",
    ];

    public static IReadOnlySet<string> Read(string projectFile)
    {
        var root = XDocument.Load(projectFile).Root;
        var namespaces = new HashSet<string>(StringComparer.Ordinal);
        if (root is null)
            return namespaces;

        if (ImplicitUsingsEnabled(root))
        {
            namespaces.UnionWith(_sdkNamespaces);
            var sdk = root.Attribute("Sdk")?.Value ?? "";
            if (sdk.Contains("Microsoft.NET.Sdk.Web", StringComparison.OrdinalIgnoreCase))
                namespaces.UnionWith(_webSdkNamespaces);
            else if (sdk.Contains("Microsoft.NET.Sdk.Worker", StringComparison.OrdinalIgnoreCase))
                namespaces.UnionWith(_workerSdkNamespaces);
        }

        // The SDK declares its items in props, before the project body, so a Remove in the body
        // takes effect on them. Items are applied in document order like MSBuild does.
        foreach (var item in root.Elements("ItemGroup").Elements("Using"))
        {
            namespaces.ExceptWith(Names(item.Attribute("Remove")));
            if (IsNamespaceImport(item))
                namespaces.UnionWith(Names(item.Attribute("Include")));
        }

        return namespaces;
    }

    /// <summary>
    /// Whether a <c>Using</c> item imports a namespace. A static or aliased item does not: it becomes
    /// <c>global using static X;</c> or <c>global using Alias = X;</c>, neither of which brings the
    /// namespace's types into scope by their plain names.
    /// </summary>
    public static bool IsNamespaceImport(XElement usingItem) =>
        usingItem.Attribute("Alias") is null && !IsTrue(usingItem.Attribute("Static")?.Value);

    private static bool ImplicitUsingsEnabled(XElement root) =>
        root.Elements("PropertyGroup").Elements("ImplicitUsings").LastOrDefault()?.Value.Trim() is { } value
        && (string.Equals(value, "enable", StringComparison.OrdinalIgnoreCase) || IsTrue(value));

    private static bool IsTrue(string? value) =>
        string.Equals(value?.Trim(), "true", StringComparison.OrdinalIgnoreCase);

    private static IEnumerable<string> Names(XAttribute? itemList) =>
        itemList?.Value.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries) ?? [];
}
