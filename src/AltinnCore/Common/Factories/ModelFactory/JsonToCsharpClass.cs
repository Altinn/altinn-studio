using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Factories.ModelFactory
{
    public class JsonToCsharpClass : IJsonToCsharpClassConfig
    {
        /// <inheritdoc/>
        public string Namespace { get; set; }
        /// <inheritdoc/>
        public string MainClass { get; set; }
        /// <inheritdoc/>
        public bool UseSingleFile { get; set; }


        public void CreateClass(JObject[] jsonData, JsonDataTypes type)
        {
            var jsonDataFields = new Dictionary<string, JsonDataTypes>();
            var fieldJsonData = new Dictionary<string, IList<Object>>();

            foreach (var jobj in jsonData)
            {
                foreach (var property in jobj.Properties())
                {

                }

            }

        }


        public class JsonDataTypes
        {
            public JsonTypesEnum Type { get; }
        }

        public enum JsonTypesEnum
        {
            String,
            Object,
            Array,
            Dictionary
        }
    }
}
