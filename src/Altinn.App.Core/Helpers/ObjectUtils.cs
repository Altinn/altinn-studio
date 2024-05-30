using System.Collections;
using System.Reflection;
using System.Xml.Serialization;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Utilities for working with model instances
/// </summary>
public static class ObjectUtils
{
    /// <summary>
    /// Set empty Guid properties named "AltinnRowId" to a new random guid
    /// </summary>
    /// <param name="model">The object to mutate</param>
    /// <param name="depth">Remaining recursion depth. To prevent infinite recursion we stop prepeation after this depth. (default matches json serialization)</param>
    public static void InitializeAltinnRowId(object model, int depth = 64)
    {
        ArgumentNullException.ThrowIfNull(model);
        var type = model.GetType();
        if (depth < 0)
        {
            throw new Exception(
                $"Recursion depth exceeded. {type.Name} in {type.Namespace} likely causes infinite recursion."
            );
        }

        if (type.Namespace?.StartsWith("System") == true)
        {
            return; // System.DateTime.Now causes infinite recursion, and we shuldn't recurse into system types anyway.
        }

        foreach (var prop in type.GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            if (PropertyIsAltinRowGuid(prop))
            {
                var value = (Guid)(prop.GetValue(model) ?? Guid.Empty);
                if (value == Guid.Empty)
                {
                    // Initialize empty Guid with new random value
                    prop.SetValue(model, Guid.NewGuid());
                }
            }
            else if (prop.PropertyType.IsGenericType && prop.PropertyType.GetGenericTypeDefinition() == typeof(List<>))
            {
                var value = prop.GetValue(model);
                if (value is not null)
                {
                    foreach (var item in (IList)value)
                    {
                        // Recurse into values of a list
                        if (item is not null)
                        {
                            InitializeAltinnRowId(item, depth - 1);
                        }
                    }
                }
            }
            // property does not have an index parameter, nor is a value type, thus we should recurse into the property
            else if (prop.GetIndexParameters().Length == 0)
            {
                var value = prop.GetValue(model);

                // continue recursion over all properties that are not null or value types
                if (value is not null)
                {
                    InitializeAltinnRowId(value, depth - 1);
                }
            }
        }
    }

    /// <summary>
    /// Xml serialization-deserialization does not preserve all properties, and we sometimes need
    /// to know how it looks when it comes back from storage.
    /// * Recursively initialize all <see cref="List{T}"/> properties on the object that are currently null
    /// * Ensure that all string properties with `[XmlTextAttribute]` that are empty or whitespace are set to null
    /// * If a class has `[XmlTextAttribute]` and no value, set the parent property to null (if the other properties has [BindNever] attribute)
    /// </summary>
    /// <param name="model">The object to mutate</param>
    /// <param name="depth">Remaining recursion depth. To prevent infinite recursion we stop prepeation after this depth. (default matches json serialization)</param>
    public static void PrepareModelForXmlStorage(object model, int depth = 64)
    {
        ArgumentNullException.ThrowIfNull(model);
        var type = model.GetType();
        if (depth < 0)
        {
            throw new Exception(
                $"Recursion depth exceeded. {type.Name} in {type.Namespace} likely causes infinite recursion."
            );
        }

        if (type.Namespace?.StartsWith("System") == true)
        {
            return;
        }

        var methodInfos = type.GetMethods();

        // Iterate over properties of the model
        foreach (var prop in type.GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            // Property has a generic type that is a subtype of List<>
            if (prop.PropertyType.IsGenericType && prop.PropertyType.GetGenericTypeDefinition() == typeof(List<>))
            {
                var value = prop.GetValue(model);
                if (value is null)
                {
                    // Initialize IList if it has null value (xml deserialization always retrurn emtpy list, not null)
                    prop.SetValue(model, Activator.CreateInstance(prop.PropertyType));
                }
                else
                {
                    // Recurse into values of a list
                    foreach (var item in (IList)value)
                    {
                        if (item is not null)
                        {
                            PrepareModelForXmlStorage(item, depth - 1);
                        }
                    }
                }
            }
            else if (prop.GetIndexParameters().Length > 0)
            {
                // Ignore properties with index parameters
            }
            else
            {
                // Property does not have an index parameter, thus we should recurse into the property
                var value = prop.GetValue(model);
                if (value is null)
                    continue;
                SetToDefaultIfShouldSerializeFalse(model, prop, methodInfos);

                // Set string properties with [XmlText] attribute to null if they are empty or whitespace
                if (
                    value is string s
                    && string.IsNullOrWhiteSpace(s)
                    && prop.GetCustomAttribute<XmlTextAttribute>() is not null
                )
                {
                    // Ensure empty strings are set to null
                    prop.SetValue(model, null);
                }

                // continue recursion over all properties that are NOT null or value types
                PrepareModelForXmlStorage(value, depth - 1);

                SetToDefaultIfShouldSerializeFalse(model, prop, methodInfos);
            }
        }
    }

    private static void SetToDefaultIfShouldSerializeFalse(object model, PropertyInfo prop, MethodInfo[] methodInfos)
    {
        string methodName = $"ShouldSerialize{prop.Name}";

        var shouldSerializeMethod = methodInfos
            .Where(m => m.Name == methodName && m.GetParameters().Length == 0 && m.ReturnType == typeof(bool))
            .SingleElement();

        if (shouldSerializeMethod?.Invoke(model, null) is false)
        {
            prop.SetValue(model, default);
        }
    }

    private static T? SingleElement<T>(this IEnumerable<T> source)
    {
        using var enumerator = source.GetEnumerator();
        if (!enumerator.MoveNext())
        {
            return default(T);
        }
        var result = enumerator.Current;
        return enumerator.MoveNext() ? default(T) : result;
    }

    /// <summary>
    /// Set all <see cref="Guid"/> properties named "AltinnRowId" to Guid.Empty
    /// </summary>
    public static void RemoveAltinnRowId(object model, int depth = 64)
    {
        ArgumentNullException.ThrowIfNull(model);
        if (depth < 0)
        {
            throw new Exception(
                $"Recursion depth exceeded. {model.GetType().Name} in {model.GetType().Namespace} likely causes infinite recursion."
            );
        }
        var type = model.GetType();
        if (type.Namespace?.StartsWith("System") == true)
        {
            return; // System.DateTime.Now causes infinite recursion, and we shuldn't recurse into system types anyway.
        }

        foreach (var prop in type.GetProperties())
        {
            // Handle guid fields named "AltinnRowId"
            if (PropertyIsAltinRowGuid(prop))
            {
                prop.SetValue(model, Guid.Empty);
            }
            // Recurse into lists
            else if (prop.PropertyType.IsGenericType && prop.PropertyType.GetGenericTypeDefinition() == typeof(List<>))
            {
                var value = prop.GetValue(model);
                if (value is not null)
                {
                    foreach (var item in (IList)value)
                    {
                        // Recurse into values of a list
                        if (item is not null)
                        {
                            RemoveAltinnRowId(item, depth - 1);
                        }
                    }
                }
            }
            // Recurse into all properties that are not lists
            else if (prop.GetIndexParameters().Length == 0)
            {
                var value = prop.GetValue(model);

                // continue recursion over all properties
                if (value is not null)
                {
                    RemoveAltinnRowId(value, depth - 1);
                }
            }
        }
    }

    private static bool PropertyIsAltinRowGuid(PropertyInfo prop)
    {
        return prop.PropertyType == typeof(Guid) && prop.Name == "AltinnRowId";
    }
}
