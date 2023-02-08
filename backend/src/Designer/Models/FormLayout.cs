using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
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

    public class Layout
    {
        public string id { get; set; }
        public string type { get; set; }
        public TextResourceBindings textResourceBindings { get; set; }
        public DataModelBindings dataModelBindings { get; set; }
        public List<Option> options { get; set; }
        public bool? required { get; set; }
        public object readOnly { get; set; }
        public List<string> children { get; set; }
        public int? maxCount { get; set; }
        public List<string> tableHeaders { get; set; }
        public List<string> triggers { get; set; }
        public Edit edit { get; set; }
        public LabelSettings labelSettings { get; set; }
        public Grid grid { get; set; }
        public int? maxFileSizeInMB { get; set; }
        public int? maxNumberOfAttachments { get; set; }
        public int? minNumberOfAttachments { get; set; }
        public string displayMode { get; set; }
        public string optionsId { get; set; }
        public int? preselectedOptionIndex { get; set; }
        public bool? secure { get; set; }
        public Dictionary<string, string> mapping { get; set; }
        public Source source { get; set; }
        public Panel panel { get; set; }
        public bool? showBackButton { get; set; }
    }

    public class DataModelBindings
    {
        public string simpleBinding { get; set; }
        public string group { get; set; }
        public string list { get; set; }
    }

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

    public class Edit
    {
        public string mode { get; set; }
        public bool saveButton { get; set; }
        public List<object> deleteButton { get; set; }
        public bool multiPage { get; set; }
        public bool openByDefault { get; set; }
        public List<Filter> filter { get; set; }
    }

    public class Filter
    {
        public string key { get; set; }
        public string value { get; set; }
    }

    public class Grid
    {
        public int md { get; set; }
        public int? xs { get; set; }
    }

    public class GroupReference
    {
        public string group { get; set; }
    }

    public class LabelSettings
    {
        public bool optionalIndicator { get; set; }
    }

    public class Number
    {
        public string thousandSeparator { get; set; }
        public string prefix { get; set; }
        public bool allowNegative { get; set; }
    }

    public class Option
    {
        public string label { get; set; }
        public string value { get; set; }
    }

    public class Panel
    {
        public bool showIcon { get; set; }
        public string variant { get; set; }
        public GroupReference groupReference { get; set; }
    }

    public class Source
    {
        public string group { get; set; }
        public string label { get; set; }
        public string value { get; set; }
    }
}