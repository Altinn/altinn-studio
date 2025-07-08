using System.ComponentModel.DataAnnotations;

namespace KubernetesWrapper.Models.Dto;

public class LogFiltersDto
{
    public string App { get; set; }

    [Range(1, 1000)]
    public int Take { get; set; } = 50;

    [Range(1, 24)]
    public double Time { get; set; } = 24;
}
