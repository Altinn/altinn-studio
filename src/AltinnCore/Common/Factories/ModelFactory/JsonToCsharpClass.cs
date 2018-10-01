using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Factories.ModelFactory
{
    public class JsonToCsharpClass : IJsonToCsharpClassConfig
    {
        public string Namespace { get; set; }
        public string MainClass { get; set; }
        public bool UseSingleFile { get; set; }


        public void CreateClass(JObject [] jsonData, JsonDataTypes type)
        {
            var JsonDataFields =  new Dictionary<string, JsonDataTypes>();
            var FieldJsonData = new Dictionary<string, IList<Object>>();

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
