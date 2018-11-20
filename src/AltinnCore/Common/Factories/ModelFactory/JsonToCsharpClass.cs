using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    /// implementation for json to charp
    /// </summary>
    public class JsonToCsharpClass : IJsonToCsharpClassConfig
    {
        /// <inheritdoc/>
        public string Namespace { get; set; }

        /// <inheritdoc/>
        public string MainClass { get; set; }

        /// <inheritdoc/>
        public bool UseSingleFile { get; set; }

        /// <summary>
        /// create class
        /// </summary>
        /// <param name="jsonData">json data</param>
        /// <param name="type">type of json data</param>
        public void CreateClass(JObject[] jsonData, JsonDataTypes type)
        {
            var jsonDataFields = new Dictionary<string, JsonDataTypes>();
            var fieldJsonData = new Dictionary<string, IList<object>>();

            foreach (var jobj in jsonData)
            {
                foreach (var property in jobj.Properties())
                {
                }
            }
        }

        /// <summary>
        /// json data types
        /// </summary>
        public class JsonDataTypes
        {
            /// <summary>
            /// type
            /// </summary>
            public JsonTypesEnum Type { get; }
        }

        /// <summary>
        /// json types
        /// </summary>
        public enum JsonTypesEnum
        {
            /// <summary>
            /// string type
            /// </summary>
            String,

            /// <summary>
            /// object type
            /// </summary>
            Object,

            /// <summary>
            /// array type
            /// </summary>
            Array,

            /// <summary>
            /// dictionary type
            /// </summary>
            Dictionary,
        }
    }
}
