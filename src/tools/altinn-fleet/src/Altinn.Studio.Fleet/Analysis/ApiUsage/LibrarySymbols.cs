using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>Which assemblies are the app library, and how a bound symbol is reduced to its declaration.</summary>
internal static class LibrarySymbols
{
    // Common and PlatformServices were the app library until v7.
    private static readonly HashSet<string> _assemblies = new(StringComparer.Ordinal)
    {
        "Altinn.App.Core",
        "Altinn.App.Api",
        "Altinn.App.Clients.Fiks",
        "Altinn.App.Common",
        "Altinn.App.PlatformServices",
    };

    public static bool IsLibraryAssembly(string? name) => name is not null && _assemblies.Contains(name);

    public static bool IsLibrary(ISymbol? symbol) =>
        symbol?.ContainingAssembly is { } assembly && IsLibraryAssembly(assembly.Name);

    /// <summary>The declaration a use binds to: an extension method call to the static method, a generic to its definition.</summary>
    public static ISymbol Normalize(ISymbol symbol)
    {
        if (symbol is IMethodSymbol method)
        {
            return (method.ReducedFrom ?? method).OriginalDefinition;
        }

        return symbol.OriginalDefinition;
    }
}
