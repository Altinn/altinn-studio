using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using JetBrains.Annotations;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents a single schema page.
    /// </summary>
    public class FormLayout
    {
        [JsonProperty(PropertyName = "$schema")]
        public string Schema { get; set; }
        public Data Data { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
}

    public class Data
    {
        public List<Layout> Layout { get; set; }
        [CanBeNull] public object Hidden { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
    }

    public class Layout
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public Dictionary<string, string> TextResourceBindings { get; set; }
        public DataModelBindings DataModelBindings { get; set; }
        public bool? Required { get; set; }
        public bool? ReadOnly { get; set; }
        [CanBeNull] public object Hidden { get; set; }
        [CanBeNull] public string Size { get; set; }
        [CanBeNull] public Image Image { get; set; }
        public bool? Simplified { get; set; }
        [CanBeNull] public string MinDate { get; set; }
        [CanBeNull] public string MaxDate { get; set; }
        public int? MaxFileSizeInMb { get; set; }
        public int? MaxNumberOfAttachments { get; set; }
        public int? MinNumberOfAttachments { get; set; }
        [CanBeNull] public string DisplayMode { get; set; }
        [CanBeNull] public List<Option> Options { get; set; }
        public int? PreselectedOptionIndex { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
    }

    public class DataModelBindings
    {
        [CanBeNull] public string SimpleBinding { get; set; }
        [CanBeNull] public string Group { get; set; }
        [CanBeNull] public string List { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
    }

    public class Image
    {
        [CanBeNull] public object Src { get; set; }
        [CanBeNull] public string Width { get; set; }
        [CanBeNull] public string Align { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
    }

    public class Option
    {
        public string Label { get; set; }
        public string Value { get; set; }
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement> UnknownProperties { get; set; }
    }
}
