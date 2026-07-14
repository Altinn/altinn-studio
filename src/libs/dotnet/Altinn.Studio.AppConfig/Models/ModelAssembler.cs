using System.Collections.Frozen;

namespace Altinn.Studio.AppConfig.Models;

internal static class ModelAssembler
{
    public static AppModel Assemble(string root, IReadOnlyList<AppModelBuilder> fragments) =>
        new()
        {
            Root = root,
            ApplicationId = fragments.Select(f => f.ApplicationId).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? "",
            DataTypes = Merge(fragments, f => f.DataTypes),
            Tasks = Merge(fragments, f => f.Tasks),
            LayoutSets = AssembleLayoutSets(fragments),
            TextResources = Merge(fragments, f => f.TextResources),
            TitleLanguages = Merge(fragments, f => f.TitleLanguages),
            SchemaProperties = Fold(fragments, f => f.SchemaProperties),
            SchemaPropertiesByFile = FoldByFile(fragments),
            SchemaPropertyPositions = Fold(fragments, f => f.SchemaPropertyPositions, StringComparer.Ordinal),
            CSharpClasses = Fold(fragments, f => f.CSharpClasses),
            CSharpModel = Fold(fragments, f => f.CSharpModel),
            OptionsFiles = Fold(fragments, f => f.OptionsFiles),
            OptionsProviders = FoldSet(fragments, f => f.OptionsProviders),
            LayoutFiles = FoldSet(fragments, f => f.LayoutFiles),
            Refs = AssembleRefs(fragments),
            ParserNotes = Merge(fragments, f => f.ParserNotes),
            ParseErrors = Merge(fragments, f => f.ParseErrors),
            UnsupportedAppVersion = fragments.Select(f => f.UnsupportedAppVersion).FirstOrDefault(v => v is not null),
            AltinnAppVersion = fragments.Select(f => f.AltinnAppVersion).FirstOrDefault(v => v is not null),
        };

    private static IReadOnlyList<T> Merge<T>(
        IReadOnlyList<AppModelBuilder> fragments,
        Func<AppModelBuilder, IEnumerable<T>> select
    ) => fragments.SelectMany(select).ToList().AsReadOnly();

    private static IReadOnlyDictionary<string, TValue> Fold<TValue>(
        IReadOnlyList<AppModelBuilder> fragments,
        Func<AppModelBuilder, IEnumerable<KeyValuePair<string, TValue>>> select,
        IEqualityComparer<string>? comparer = null
    )
    {
        var result = comparer is null ? new Dictionary<string, TValue>() : new Dictionary<string, TValue>(comparer);
        foreach (var fragment in fragments)
        {
            foreach (var kv in select(fragment))
                result[kv.Key] = kv.Value;
        }
        return result.ToFrozenDictionary(result.Comparer);
    }

    private static IReadOnlySet<string> FoldSet(
        IReadOnlyList<AppModelBuilder> fragments,
        Func<AppModelBuilder, IEnumerable<string>> select
    )
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        foreach (var fragment in fragments)
            result.UnionWith(select(fragment));
        return result.ToFrozenSet(StringComparer.Ordinal);
    }

    private static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> FoldByFile(
        IReadOnlyList<AppModelBuilder> fragments
    )
    {
        var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);
        foreach (var fragment in fragments)
        {
            foreach (var (file, props) in fragment.SchemaPropertiesByFile)
            {
                if (result.TryGetValue(file, out var existing))
                {
                    foreach (var kv in props)
                        existing[kv.Key] = kv.Value;
                }
                else
                {
                    result[file] = new Dictionary<string, string>(props, StringComparer.Ordinal);
                }
            }
        }
        return result.ToFrozenDictionary(
            kv => kv.Key,
            IReadOnlyDictionary<string, string> (kv) => kv.Value.ToFrozenDictionary(StringComparer.Ordinal),
            StringComparer.Ordinal
        );
    }

    private static SemanticReferences AssembleRefs(IReadOnlyList<AppModelBuilder> fragments) =>
        new()
        {
            ComponentIds = Merge(fragments, f => f.Refs.ComponentIds),
            LayoutSets = Merge(fragments, f => f.Refs.LayoutSets),
            DataTypes = Merge(fragments, f => f.Refs.DataTypes),
            TaskIds = Merge(fragments, f => f.Refs.TaskIds),
            PageFiles = Merge(fragments, f => f.Refs.PageFiles),
            DataModel = Merge(fragments, f => f.Refs.DataModel),
            TextResources = Merge(fragments, f => f.Refs.TextResources),
            OptionsIds = Merge(fragments, f => f.Refs.OptionsIds),
            CSharp = Merge(fragments, f => f.Refs.CSharp),
            PolicyOrgApps = Merge(fragments, f => f.Refs.PolicyOrgApps),
        };

    private static IReadOnlyList<LayoutSet> AssembleLayoutSets(IReadOnlyList<AppModelBuilder> fragments)
    {
        var targets = new List<LayoutSetBuilder>();
        foreach (var fragment in fragments)
        {
            foreach (var fromSet in fragment.LayoutSets)
            {
                var isDeclaration = !string.IsNullOrEmpty(fromSet.Position.File);
                var target = isDeclaration
                    ? null
                    : targets.FirstOrDefault(s => string.Equals(s.Id, fromSet.Id, StringComparison.Ordinal));
                if (target is null)
                {
                    target = new LayoutSetBuilder { Id = fromSet.Id, Position = fromSet.Position };
                    targets.Add(target);
                }
                target.AllComponents.AddRange(fromSet.AllComponents);
                foreach (var kv in fromSet.Components)
                    target.Components.TryAdd(kv.Key, kv.Value);
                target.PageFileRefs.AddRange(fromSet.PageFileRefs);
                target.DefaultDataReq ??= fromSet.DefaultDataReq;
            }
        }
        return targets.Select(t => t.Freeze()).ToList().AsReadOnly();
    }
}
