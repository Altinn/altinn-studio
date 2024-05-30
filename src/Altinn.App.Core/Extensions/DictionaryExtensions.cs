using System.Net;
using System.Text;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for <see cref="Dictionary{TKey, TValue}"/>
/// </summary>
public static class DictionaryExtensions
{
    /// <summary>
    /// Converts a dictionary to a name value string on the form key1=value1,key2=value2 url encoding both key and value.
    /// </summary>
    public static string ToUrlEncodedNameValueString(this Dictionary<string, string?>? parameters, char separator)
    {
        if (parameters == null)
        {
            return string.Empty;
        }

        StringBuilder builder = new();
        foreach (var param in parameters)
        {
            if (builder.Length > 0)
            {
                builder.Append(separator);
            }

            builder.Append(WebUtility.UrlEncode(param.Key));
            builder.Append('=');
            builder.Append(WebUtility.UrlEncode(param.Value));
        }

        return builder.ToString();
    }
}
