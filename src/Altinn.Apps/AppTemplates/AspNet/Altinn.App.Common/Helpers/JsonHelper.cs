using System.Collections.Generic;
using System.Linq;

using Newtonsoft.Json.Linq;

namespace Altinn.App.Common.Helpers
{
    /// <summary>
    /// Helper class for processing JSON objects
    /// </summary>
    public class JsonHelper
    {
        /// <summary>
        /// Find changed fields between old and new json objects
        /// </summary>
        /// <param name="oldJson">The old JSON object</param>
        /// <param name="currentJson">The new JSON object</param>
        /// <returns>Key-value pairs of the changed fields</returns>
        public static Dictionary<string, object> FindChangedFields(string oldJson, string currentJson)
        {
            JToken old = JToken.Parse(oldJson);
            JToken current = JToken.Parse(currentJson);
            Dictionary<string, object> dict = new Dictionary<string, object>();
            FindDiff(dict, old, current, string.Empty);
            return dict;
        }

        private static void FindDiff(Dictionary<string, object> dict, JToken Old, JToken Current, string prefix)
        {
            if (JToken.DeepEquals(Old, Current))
            {
                return;
            }

            switch (Current.Type)
            {
                case JTokenType.Object:
                    JObject current = Current as JObject;
                    JObject old = Old as JObject;
                    IEnumerable<string> addedKeys = current.Properties().Select(c => c.Name).Except(old.Properties().Select(c => c.Name));
                    IEnumerable<string> removedKeys = old.Properties().Select(c => c.Name).Except(current.Properties().Select(c => c.Name));
                    IEnumerable<string> unchangedKeys = current.Properties().Where(c => JToken.DeepEquals(c.Value, old[c.Name])).Select(c => c.Name);
                    foreach (string key in addedKeys)
                    {
                        FindDiff(dict, new JObject(), current[key], Join(prefix, key));
                    }

                    foreach (string key in removedKeys)
                    {
                        dict.Add(Join(prefix, key), null);
                    }

                    var potentiallyModifiedKeys = current.Properties().Select(c => c.Name).Except(addedKeys).Except(unchangedKeys);
                    foreach (var key in potentiallyModifiedKeys)
                    {
                        FindDiff(dict, old[key], current[key], Join(prefix, key));
                    }

                    break;

                case JTokenType.Array:
                    int index = 0;
                    foreach (JToken value in Current.Children())
                    {
                        FindDiff(dict, new JObject(), value, $"{prefix}[{index}]");
                        index++;
                    }

                    break;

                default:
                    dict.Add(prefix, ((JValue)Current).Value);
                    break;
            }
        }

        private static string Join(string prefix, string name)
        {
            return string.IsNullOrEmpty(prefix) ? name : prefix + "." + name;
        }
    }
}
