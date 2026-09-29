namespace Altinn.Studio.AppConfig.Models;

internal static class SymbolResolver
{
    public static SymbolTable Build(AppModel model)
    {
        var index = SymbolIndexer.Build(model);
        var bindings = ReferenceResolver.ResolveBindings(model);
        return new SymbolTable
        {
            Declarations = index.Declarations,
            Uses = index.Uses,
            Site = index.Site,
            Unresolved = ReferenceResolver.ResolveDangling(model, bindings),
            Bindings = bindings,
        };
    }
}
