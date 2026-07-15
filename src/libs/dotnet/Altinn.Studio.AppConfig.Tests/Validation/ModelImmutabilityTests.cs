using System.Reflection;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class ModelImmutabilityTests
{
    private static readonly Type[] MutableCollectionDefinitions =
    {
        typeof(List<>),
        typeof(Dictionary<,>),
        typeof(HashSet<>),
        typeof(IList<>),
        typeof(IDictionary<,>),
        typeof(ISet<>),
        typeof(ICollection<>),
    };

    [Fact]
    public void PublicModelSurface_ExposesNoMutableCollections()
    {
        var modelTypes = typeof(AppModel)
            .Assembly.GetTypes()
            .Where(t => t.IsPublic && t.Namespace == typeof(AppModel).Namespace)
            .ToList();
        Assert.NotEmpty(modelTypes);

        var violations = new List<string>();
        foreach (var type in modelTypes)
        {
            foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                var pt = prop.PropertyType;
                if (pt.IsGenericType && MutableCollectionDefinitions.Contains(pt.GetGenericTypeDefinition()))
                    violations.Add($"{type.Name}.{prop.Name}: {pt.Name}");
            }
        }

        Assert.Empty(violations);
    }

    [Fact]
    public void AssembledModel_HoldsNoMutableCollectionInstances()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"x"}}]}}""",
                ["App/config/texts/resource.nb.json"] = """{"language":"nb","resources":[{"id":"t","value":"v"}]}""",
            }
        );
        var model = AppConfigEngine.Open(dir).Build();

        var violations = new List<string>();
        foreach (var (owner, property, value) in CollectionProperties(model))
        {
            var type = value.GetType();
            if (type.IsArray)
                violations.Add($"{owner}.{property}: {type.Name}");
            else if (type.IsGenericType && MutableCollectionDefinitions.Contains(type.GetGenericTypeDefinition()))
                violations.Add($"{owner}.{property}: {type.Name}");
        }

        Assert.Empty(violations);
    }

    private static IEnumerable<(string Owner, string Property, object Value)> CollectionProperties(AppModel model)
    {
        var seen = new HashSet<object>(ReferenceEqualityComparer.Instance);
        var pending = new Queue<(string Path, object Instance)>();
        pending.Enqueue((nameof(AppModel), model));

        while (pending.Count > 0)
        {
            var (path, instance) = pending.Dequeue();
            if (instance is null or string || !seen.Add(instance))
                continue;

            foreach (var prop in instance.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                if (prop.GetIndexParameters().Length > 0)
                    continue;
                var value = prop.GetValue(instance);
                if (value is null or string)
                    continue;

                var valuePath = $"{path}.{prop.Name}";
                if (value is System.Collections.IEnumerable enumerable)
                {
                    yield return (path, prop.Name, value);
                    foreach (var element in enumerable)
                    {
                        if (element is not null and not string)
                            pending.Enqueue(($"{valuePath}[]", element));
                    }
                }
                else if (value.GetType().Assembly == typeof(AppModel).Assembly)
                {
                    pending.Enqueue((valuePath, value));
                }
            }
        }
    }
}
