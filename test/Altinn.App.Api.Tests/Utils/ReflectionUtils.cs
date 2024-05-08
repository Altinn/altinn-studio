namespace Altinn.App.Api.Tests.Utils;

public class ReflectionUtils
{
    public static string GetTypeNameWithGenericArguments<T>()
    {
        return GetTypeNameWithGenericArguments(typeof(T));
    }

    private static string GetTypeNameWithGenericArguments(Type type)
    {
        if (!type.IsGenericType)
        {
            return type.Name;
        }

        var genericArguments = type.GetGenericArguments();
        var genericArgumentsString = string.Join(", ", genericArguments.Select(GetTypeNameWithGenericArguments));
        return $"{type.Name.Split('`')[0]}<{genericArgumentsString}>"; // Remove the `1, `2, etc. from the type name
    }
}
