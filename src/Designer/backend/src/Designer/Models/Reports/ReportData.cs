using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.Models.Reports;

public class ReportData
{
    public required string Org { get; init; }
    public required string Environment { get; init; }
    public DateTimeOffset From { get; init; }
    public DateTimeOffset To { get; init; }
    public List<AppReportData> Apps { get; init; } = [];
}

public class AppReportData
{
    public required string AppName { get; init; }
    public IEnumerable<Metric> Metrics { get; init; } = [];
    public IEnumerable<AppErrorMetric> ErrorMetrics { get; init; } = [];
}
