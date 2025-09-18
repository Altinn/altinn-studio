namespace Altinn.Studio.Admin.Models;

public sealed class PrometheusResult
{
    public Dictionary<string, string>? Metric { get; set; }
    public object[]? Value { get; set; }
    public List<object>? Values { get; set; }
}
