using System.Collections.Generic;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents a single schema page.
    /// </summary>
    public class FormLayout
    {
        [JsonPropertyName("$schema")]
        public string schema { get; set; }
        public Data data { get; set; }
    }

    public class Data
    {
        public List<Layout> layout { get; set; }
        public bool? hidden { get; set; }
    }

    public class Layout
    {
        public string id { get; set; }
        public string type { get; set; }
        public Dictionary<string, string> textResourceBindings { get; set; }
        public DataModelBindings dataModelBindings { get; set; }
        public bool? required { get; set; }
        public bool? readOnly { get; set; }
        [CanBeNull] public Expression hidden { get; set; }
        [CanBeNull] public string size { get; set; }
        [CanBeNull] public Image image { get; set; }
        public bool? simplified { get; set; }
        [CanBeNull] public string minDate { get; set; }
        [CanBeNull] public string maxDate { get; set; }
        public int? maxFileSizeInMB { get; set; }
        public int? maxNumberOfAttachments { get; set; }
        public int? minNumberOfAttachments { get; set; }
        [CanBeNull] public string displayMode { get; set; }
        [CanBeNull] public List<Option> options { get; set; }
        public int? preselectedOptionIndex { get; set; }
    }

    public class DataModelBindings
    {
        [CanBeNull] public string simpleBinding { get; set; }
        [CanBeNull] public string group { get; set; }
        [CanBeNull] public string list { get; set; }
    }

    public class Image
    {
        [CanBeNull] public object src { get; set; }
        [CanBeNull] public string width { get; set; }
        [CanBeNull] public string align { get; set; }
    }

    public class Option
    {
        public string label { get; set; }
        public string value { get; set; }
    }
}
