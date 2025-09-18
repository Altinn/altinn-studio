namespace Altinn.Studio.Admin.Models;

public sealed class PrometheusData
{
    public string? ResultType { get; set; }
    public List<PrometheusResult>? Result { get; set; }
}
