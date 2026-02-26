using System.Reflection;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class TypeExtensions
{
    /// <summary>
    /// Checks if a type has a given public property. Supports dot-notation paths.
    /// </summary>
    public static bool HasPublicPropertyPath(this Type? type, string? propertyPath)
    {
        if (type is null || propertyPath is null)
            return false;

        Type currentType = type;
        foreach (var part in propertyPath.Split('.'))
        {
            var property = currentType.GetProperty(part, BindingFlags.Public | BindingFlags.Instance);
            if (property is null)
                return false;

            currentType = property.PropertyType;
        }

        return true;
    }
}
