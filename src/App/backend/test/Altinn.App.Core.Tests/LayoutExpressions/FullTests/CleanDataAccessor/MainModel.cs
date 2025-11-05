using System.Text.Json.Serialization;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.CleanDataAccessor;

public record MainModel
{
    public bool? HideMainTitle { get; set; }
    public string? MainTitle { get; set; }
    public string? UnboundField { get; set; }
    public bool? HidePage1 { get; set; }

    public bool? HideMainComponentGroup { get; set; }
    public List<MainComponentGroupItem?>? MainComponentGroup { get; set; }

    public bool? HideSubLayout { get; set; }

    public record MainComponentGroupItem
    {
        [JsonPropertyName("altinnRowId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public Guid AltinnRowId { get; set; }

        public string? Name { get; set; }
        public bool? HideRow { get; set; }
        public string? Description { get; set; }
        public bool? HideName { get; set; }
    }
}

public record SubModel
{
    public bool? HideSubPage { get; set; }
    public bool? HideSubPageTitle { get; set; }
    public string? SubPageTitle { get; set; }
    public string? UnboundField { get; set; }

    public bool? HideSubComponentGroup { get; set; }
    public List<SubGroup?>? SubComponentGroup { get; set; }

    public record SubGroup
    {
        [JsonPropertyName("altinnRowId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public Guid AltinnRowId { get; set; }

        public bool? HideRow { get; set; }
        public bool? HideName { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
