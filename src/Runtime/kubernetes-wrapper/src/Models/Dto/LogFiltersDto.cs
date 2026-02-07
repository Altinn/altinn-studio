using System.ComponentModel.DataAnnotations;
using Altinn.Studio.KubernetesWrapper.Configuration;

namespace Altinn.Studio.KubernetesWrapper.Models.Dto;

public class LogFiltersDto
{
    public string App { get; set; }

    [Range(0, LogQueryLimits.MaxTake)]
    public int Take { get; set; }

    [Range(0, LogQueryLimits.MaxTime)]
    public double Time { get; set; }
}
