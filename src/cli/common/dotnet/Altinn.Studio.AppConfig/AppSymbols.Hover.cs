using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    private const int HoverValueMaxLength = 120;

    public string? SymbolHover(string file, int line, int col)
    {
        ArgumentNullException.ThrowIfNull(file);
        var model = _config.Current;
        if (SymbolAt(model, file, line, col) is not { } sym)
            return null;
        var lines = sym.Kind switch
        {
            SymbolKind.Component => ComponentHover(model, sym),
            SymbolKind.Page => PageHover(model, sym),
            SymbolKind.DataModelPath => DataModelHover(model, sym, MarkupFormat.Markdown),
            SymbolKind.TextKey => TextKeyHover(model, sym, MarkupFormat.Markdown),
            SymbolKind.DataType => DataTypeHover(model, sym),
            SymbolKind.OptionsId => OptionsHover(model, sym),
            SymbolKind.Task => TaskHover(model, sym),
            SymbolKind.LayoutSet => LayoutSetHover(model, sym),
            SymbolKind.CSharpClass => CSharpClassHover(model, sym),
            _ => null,
        };
        if (lines is null)
            return null;

        var refs = ReferenceSites(model, sym).Count;
        lines.Add($"{refs} reference{(refs == 1 ? "" : "s")}");
        return Card(MarkupFormat.Markdown, lines);
    }

    private static string? Card(MarkupFormat format, List<string>? lines)
    {
        if (lines is null)
            return null;
        if (lines.Count == 1)
            return lines[0];
        var lineBreak = format == MarkupFormat.Markdown ? "  \n" : "\n";
        return lines[0] + "\n\n" + string.Join(lineBreak, lines.Skip(1));
    }

    private static string Strong(MarkupFormat format, string text) =>
        format == MarkupFormat.Markdown ? $"**{text}**" : text;

    private static string Code(MarkupFormat format, string text) =>
        format == MarkupFormat.Markdown ? $"`{text.Replace('`', '\'')}`" : text;

    private static List<string>? ComponentHover(AppModel model, Symbol sym)
    {
        var set = model.LayoutSets.FirstOrDefault(s => string.Equals(s.Id, sym.Scope, StringComparison.Ordinal));
        if (set is null || !set.Components.TryGetValue(sym.Value, out var comp))
            return new List<string> { $"**Component** `{sym.Value}`" };
        var lines = new List<string>
        {
            $"**Component** `{comp.Id}` — {comp.Type}",
            $"Page `{comp.Page}` · layout-set `{comp.LayoutSet}`",
        };
        foreach (var (name, binding) in comp.Bindings.OrderBy(b => b.Key, StringComparer.Ordinal))
            lines.Add(
                $"{name} → `{binding.Path}`"
                    + (binding.ExplicitDataType is { Length: > 0 } dt ? $" (data type `{dt}`)" : "")
            );
        return lines;
    }

    private static List<string> PageHover(AppModel model, Symbol sym)
    {
        var set = model.LayoutSets.FirstOrDefault(s => string.Equals(s.Id, sym.Scope, StringComparison.Ordinal));
        var components = set?.AllComponents.Count(c => string.Equals(c.Page, sym.Value, StringComparison.Ordinal));
        var suffix = "";
        if (components is { } n)
            suffix = $" · {n} component{(n == 1 ? "" : "s")}";
        return new List<string> { $"**Page** `{sym.Value}`", $"Layout-set `{sym.Scope}`" + suffix };
    }

    private static List<string>? DataModelHover(AppModel model, Symbol sym, MarkupFormat format)
    {
        var schemaFile = sym.Scope.Length > 0 ? AppPaths.SchemaFile(sym.Scope) : null;
        var props =
            schemaFile is not null && model.SchemaPropertiesByFile.TryGetValue(schemaFile, out var pinned)
                ? pinned
                : model.SchemaProperties;
        if (
            !ModelPath.TryResolveType(props, sym.Value, out var type)
            && !ReferenceResolver.ResolvesInCSharpModel(model, sym.Scope, sym.Value)
        )
            return null;
        var lines = new List<string>
        {
            $"{Strong(format, "Data model")} {Code(format, sym.Value)}" + (type is { Length: > 0 } ? $" — {type}" : ""),
        };
        lines.Add(
            sym.Scope.Length > 0
                ? $"Model {Code(format, sym.Scope)} ({AppPaths.SchemaFile(sym.Scope)})"
                : "Model: unpinned (checked against all schemas)"
        );
        return lines;
    }

    private static List<string>? TextKeyHover(AppModel model, Symbol sym, MarkupFormat format)
    {
        var builtin = BuiltinTextKeys.Keys.Contains(sym.Value);
        if (!builtin && model.SymbolTable.DeclarationsOf(sym).Count == 0)
            return null;
        var lines = new List<string> { $"{Strong(format, "Text key")} {Code(format, sym.Value)}" };
        var hasValue = false;
        foreach (var tr in model.TextResources.OrderBy(t => t.Language, StringComparer.Ordinal))
        {
            if (!tr.Values.TryGetValue(sym.Value, out var value))
                continue;
            hasValue = true;
            lines.Add(
                $"{(tr.Language.Length > 0 ? tr.Language : "?")}: {Code(format, SingleLine(value, HoverValueMaxLength))}"
            );
        }
        if (!hasValue && builtin)
            lines.Add("Built-in frontend text (value ships with the app frontend)");
        return lines;
    }

    private static List<string> DataTypeHover(AppModel model, Symbol sym)
    {
        var dt = model.DataTypes.FirstOrDefault(d => string.Equals(d.Id, sym.Value, StringComparison.Ordinal));
        if (dt is null)
            return new List<string> { $"**Data type** `{sym.Value}`" };
        var detail = new List<string>();
        if (dt.IsForm)
            detail.Add($"form model `{dt.ClassRef}`");
        if (dt.TaskId.Length > 0)
            detail.Add($"task `{dt.TaskId}`");
        if (dt.MaxCount is { } max)
            detail.Add($"maxCount {max}");
        return new List<string>
        {
            $"**Data type** `{dt.Id}`",
            detail.Count > 0 ? string.Join(" · ", detail) : "attachment/data element type",
        };
    }

    private static List<string> OptionsHover(AppModel model, Symbol sym)
    {
        string detail;
        if (model.OptionsFiles.ContainsKey(sym.Value))
            detail = $"`App/options/{sym.Value}.json`";
        else if (model.OptionsProviders.TryGetValue(sym.Value, out var provider))
            detail = $"Registered in code by `{provider.RegisteredBy}` in `{provider.Position.File}`";
        else
            detail = "Not found (no file or registered provider)";
        return new List<string> { $"**Option list** `{sym.Value}`", detail };
    }

    private static List<string> TaskHover(AppModel model, Symbol sym)
    {
        var task = model.Tasks.FirstOrDefault(t => string.Equals(t.Id, sym.Value, StringComparison.Ordinal));
        return new List<string>
        {
            $"**Process task** `{sym.Value}`" + (task is { TaskType.Length: > 0 } ? $" — {task.TaskType}" : ""),
        };
    }

    private static List<string> LayoutSetHover(AppModel model, Symbol sym)
    {
        var set = model.LayoutSets.FirstOrDefault(s => string.Equals(s.Id, sym.Value, StringComparison.Ordinal));
        var pages = model.LayoutFiles.Count(f =>
            string.Equals(AppPaths.SetIdOf(f), sym.Value, StringComparison.Ordinal)
        );
        var detail = new List<string>();
        if (set?.DefaultDataReq is { Value.Length: > 0 } req)
            detail.Add($"default data type `{req.Value}`");
        detail.Add($"{pages} page{(pages == 1 ? "" : "s")}");
        return new List<string> { $"**Layout set** `{sym.Value}`", string.Join(" · ", detail) };
    }

    private static List<string> CSharpClassHover(AppModel model, Symbol sym)
    {
        var info = model.CSharpModel.Values.FirstOrDefault(t =>
            string.Equals(t.FullyQualifiedName, sym.Value, StringComparison.Ordinal)
            || t.FullyQualifiedName.EndsWith("." + sym.Value, StringComparison.Ordinal)
        );
        var lines = new List<string> { $"**C# class** `{info?.FullyQualifiedName ?? sym.Value}`" };
        if (info?.Span is { } span)
            lines.Add($"`{span.File}`");
        return lines;
    }

    private static string SingleLine(string value, int maxLength)
    {
        var flat = string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (flat.Length <= maxLength)
            return flat;
        var cut = maxLength - 1;
        if (char.IsHighSurrogate(flat[cut - 1]))
            cut--;
        return flat[..cut].TrimEnd() + "…";
    }
}
