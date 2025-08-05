using System.ComponentModel.DataAnnotations;
using KubernetesWrapper.Configuration;

namespace KubernetesWrapper.Models.Dto;

public class LogFiltersDto
{
    public string App { get; set; }

    [Range(0, LogQueryLimits.MaxTake)]
    public int Take { get; set; } = 50;

    [Range(0, LogQueryLimits.MaxTime)]
    public double Time { get; set; } = 1;
}
