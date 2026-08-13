using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Manage custom keywords for the data modeling module
/// </summary>
public static class JsonSchemaKeywords
{
    private static readonly object s_lock = new object();

    private static readonly JsonSerializerOptions s_serializerOptions = new()
    {
        TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
    };

    private static volatile bool s_keywordsRegistered;

    /// <summary>
    /// Deserializes a JSON schema using reflection metadata so registered custom keywords are supported.
    /// </summary>
    public static JsonSchema FromText(string jsonText) => JsonSchema.FromText(jsonText, s_serializerOptions);

    /// <summary>
    /// Register custom keywords in
    /// </summary>
    public static void RegisterXsdKeywords()
    {
        // Basic double checked locking pattern
        if (!s_keywordsRegistered)
        {
            lock (s_lock)
            {
                if (!s_keywordsRegistered)
                {
                    IEnumerable<Type> keywordTypes = typeof(JsonSchemaKeywords)
                        .Assembly.GetTypes()
                        .Where(t =>
                            typeof(IJsonSchemaKeyword).IsAssignableFrom(t)
                            && t.GetCustomAttribute<SchemaKeywordAttribute>() != null
                        );

                    MethodInfo registerMethod = typeof(SchemaKeywordRegistry)
                        .GetMethods(BindingFlags.Static | BindingFlags.Public)
                        .Single(method =>
                            method.Name == "Register"
                            && method.IsGenericMethodDefinition
                            && method.GetGenericArguments().Length == 1
                            && method.GetParameters().Length == 0
                        );

                    foreach (Type keywordType in keywordTypes)
                    {
                        registerMethod.MakeGenericMethod(keywordType).Invoke(null, Array.Empty<object>());
                    }

                    s_keywordsRegistered = true;
                }
            }
        }
    }
}
