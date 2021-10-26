using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Manage custom keywords for the data modeling module
    /// </summary>
    public static class JsonSchemaKeywords
    {
        private static readonly object Lock = new object();

        private static volatile bool _keywordsRegistered;

        /// <summary>
        /// Register custom keywords in 
        /// </summary>
        public static void RegisterXsdKeywords()
        {
            // Basic double checked locking pattern
            if (!_keywordsRegistered)
            {
                lock (Lock)
                {
                    if (!_keywordsRegistered)
                    {
                        IEnumerable<Type> keywordTypes = typeof(JsonSchemaKeywords)
                           .Assembly
                           .GetTypes()
                           .Where(t => typeof(IJsonSchemaKeyword).IsAssignableFrom(t) &&
                                       t.GetCustomAttribute<SchemaKeywordAttribute>() != null);

                        MethodInfo registerMethod = typeof(SchemaKeywordRegistry)
                           .GetMethod("Register", BindingFlags.Static | BindingFlags.Public);
                        Debug.Assert(registerMethod != null, nameof(registerMethod) + " != null");

                        foreach (Type keywordType in keywordTypes)
                        {
                            registerMethod
                               .MakeGenericMethod(keywordType)
                               .Invoke(null, Array.Empty<object>());
                        }

                        _keywordsRegistered = true;
                    }
                }
            }
        }
    }
}
