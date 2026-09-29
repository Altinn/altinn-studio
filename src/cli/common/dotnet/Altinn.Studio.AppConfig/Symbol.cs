using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public readonly record struct Symbol(SymbolKind Kind, string Value, string Scope = "")
{
    public static Symbol Component(string id, string layoutSet) => new(SymbolKind.Component, id, layoutSet);

    public static Symbol Task(string id) => new(SymbolKind.Task, id);
}
