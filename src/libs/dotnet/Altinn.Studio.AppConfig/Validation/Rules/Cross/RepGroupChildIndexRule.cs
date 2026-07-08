using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class RepGroupChildIndexRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-REPGROUP-CHILD-INDEX",
            "Repeating-group children must not index the group's array",
            "At runtime the frontend transposes a child's binding onto the current row "
                + "(items.field is read as items[i].field). A binding that already carries an "
                + "explicit index on the group's own array (items[0].field) gets the row index "
                + "applied on top, so the resolved path never matches the data and the field is "
                + "silently dead — while the schema existence check (which strips indices) accepts "
                + "it. Verified against the frontend's transposeDataBinding on a running app.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var (set, group) in app.ComponentsOfType("RepeatingGroup"))
        {
            if (!group.Bindings.TryGetValue("group", out var groupBinding) || groupBinding.Path.Length == 0)
                continue;
            var indexedGroupPrefix = groupBinding.Path + "[";
            var groupDataType = BindingResolver.Resolve(app, set, groupBinding);

            foreach (var child in Descendants(set, group))
            {
                foreach (var (name, binding) in child.Bindings)
                {
                    // Only the proven-broken shape: an explicit index directly on the group's
                    // array. A deeper index (items.sub[0].x) or an index on an unrelated array
                    // is not judged here — the runtime behaviour there is unverified.
                    if (!binding.Path.StartsWith(indexedGroupPrefix, StringComparison.Ordinal))
                        continue;
                    // Transposition is per data model: a binding addressing a different
                    // dataType never gets the group's row index applied.
                    var childDataType = BindingResolver.Resolve(app, set, binding);
                    if (!string.Equals(childDataType, groupDataType, StringComparison.Ordinal))
                        continue;
                    yield return Metadata.Report(
                        $"\"{name}\" on \"{child.Id}\" binds \"{binding.Path}\" with an explicit index on "
                            + $"the array of its repeating group \"{group.Id}\" ({groupBinding.Path}) — the "
                            + $"row transposition doubles the index; bind \"{WithoutBoundaryIndex(binding.Path, groupBinding.Path)}\" "
                            + "and let the row supply it",
                        child.Position.Child("dataModelBindings").Child(name)
                    );
                }
            }
        }
    }

    // items[0].subfield (group items) -> items.subfield: drop only the boundary index the
    // transposition supplies; anything deeper is kept verbatim.
    private static string WithoutBoundaryIndex(string path, string groupPath)
    {
        var close = path.IndexOf(']', groupPath.Length);
        return close < 0 ? path : groupPath + path[(close + 1)..];
    }

    // The group's children closure (children of nested containers included): everything inside
    // renders in row context and transposes. Missing ids are REF-LAYOUT-COMPONENT-ID's business;
    // the seen-set keeps a malformed cyclic graph finite.
    private static IEnumerable<LayoutComponent> Descendants(LayoutSet set, LayoutComponent root)
    {
        var queue = new Queue<string>(root.Children);
        var seen = new HashSet<string>(StringComparer.Ordinal) { root.Id };
        while (queue.Count > 0)
        {
            var id = queue.Dequeue();
            if (!seen.Add(id) || !set.Components.TryGetValue(id, out var component))
                continue;
            yield return component;
            foreach (var childId in component.Children)
                queue.Enqueue(childId);
        }
    }
}
