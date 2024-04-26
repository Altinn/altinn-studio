using System.Collections;
using System.Reflection;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Utilities for working with model instances
/// </summary>
public static class ObjectUtils
{
    /// <summary>
    /// Recursively initialize all <see cref="List{T}"/> properties on the object that are currently null
    /// Also ensure that all string properties that are empty are set to null
    /// And set empty Guid properties named "AltinnRowId" to a new random guid
    /// </summary>
    /// <param name="model">The object to mutate</param>
    public static void InitializeAltinnRowId(object model)
    {
        ArgumentNullException.ThrowIfNull(model);

        foreach (var prop in model.GetType().GetProperties())
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
                if (value is null)
                {
                    // Initialize IList with null value
                    prop.SetValue(model, Activator.CreateInstance(prop.PropertyType));
                }
                else
                {
                    foreach (var item in (IList)value)
                    {
                        // Recurse into values of a list
                        if (item is not null)
                        {
                            InitializeAltinnRowId(item);
                        }
                    }
                }
            }
            else if (prop.GetIndexParameters().Length == 0)
            {
                var value = prop.GetValue(model);

                if (value is string s && string.IsNullOrWhiteSpace(s))
                {
                    // Initialize string with null value (xml serialization does not always preserve "")
                    prop.SetValue(model, null);
                }

                // continue recursion over all properties that are not null or value types
                if (value?.GetType().IsValueType == false)
                {
                    InitializeAltinnRowId(value);
                }
            }
        }
    }

    /// <summary>
    /// Set all <see cref="Guid"/> properties named "AltinnRowId" to Guid.Empty
    /// </summary>
    public static void RemoveAltinnRowId(object model)
    {
        ArgumentNullException.ThrowIfNull(model);

        foreach (var prop in model.GetType().GetProperties())
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
                            RemoveAltinnRowId(item);
                        }
                    }
                }
            }
            // Recurse into all properties that are not lists
            else if (prop.GetIndexParameters().Length == 0)
            {
                var value = prop.GetValue(model);

                // continue recursion over all properties
                if (value?.GetType().IsValueType == false)
                {
                    RemoveAltinnRowId(value);
                }
            }
        }
    }

    private static bool PropertyIsAltinRowGuid(PropertyInfo prop)
    {
        return prop.PropertyType == typeof(Guid) && prop.Name == "AltinnRowId";
    }
}
