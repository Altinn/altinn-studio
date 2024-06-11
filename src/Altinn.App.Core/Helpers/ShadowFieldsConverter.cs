using System.Text.Json.Serialization.Metadata;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// This class is used to remove shadow fields from the JSON serialization.
/// </summary>
[Obsolete("This functionality will be removed in the future")]
public class IgnorePropertiesWithPrefix
{
    private readonly string _ignorePrefix;

    /// <summary>
    /// Initializes a new instance of the <see cref="IgnorePropertiesWithPrefix"/> class.
    /// </summary>
    public IgnorePropertiesWithPrefix(string prefix) => _ignorePrefix = prefix;

    /// <summary>
    /// This method is called by the JSON serializer to remove all properties with the defined prefix.
    /// </summary>
    public void ModifyPrefixInfo(JsonTypeInfo ti)
    {
        if (ti.Kind != JsonTypeInfoKind.Object)
            return;

        ti.Properties.RemoveAll(prop => prop.Name.StartsWith(_ignorePrefix, StringComparison.Ordinal));
    }
}

/// <summary>
/// This class extends the <![CDATA[IList<T>]]> interface with a RemoveAll method.
/// </summary>
public static class ListHelpers
{
    /// <summary>
    /// <![CDATA[IList<T>]]> implementation of <![CDATA[IList<T>.RemoveAll]]> method.
    /// </summary>
    public static void RemoveAll<T>(this IList<T> list, Predicate<T> predicate)
    {
        for (int i = 0; i < list.Count; i++)
        {
            if (predicate(list[i]))
            {
                list.RemoveAt(i--);
            }
        }
    }
}
