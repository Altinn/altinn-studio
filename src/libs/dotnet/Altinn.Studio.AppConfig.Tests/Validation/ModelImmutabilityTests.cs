using System.Reflection;
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
}
