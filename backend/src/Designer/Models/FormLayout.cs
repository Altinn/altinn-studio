using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents a single schema page.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class FormLayout
    {
        [JsonProperty("$schema")]
        public string schema { get; set; }
        public Data data { get; set; }
    }

    public class Data
    {
        public List<Layout> layout { get; set; }
    }

#nullable enable
    public class Layout
    {
        public string id { get; set; }
        public string type { get; set; }
        public TextResourceBindings textResourceBindings { get; set; }
        public DataModelBindings dataModelBindings { get; set; }
        public bool? required { get; set; }
        public object readOnly { get; set; }
    }

    public class DataModelBindings
    {
        public string simpleBinding { get; set; }
        public string group { get; set; }
        public string list { get; set; }
    }

#nullable enable
    public class TextResourceBindings
    {
        public string? title { get; set; }
        public List<object>? edit_button_open { get; set; }
        public string? add_button { get; set; }
        public string? body { get; set; }
        public string? add_label { get; set; }
        public string? next { get; set; }
        public string? back { get; set; }
    }
}
