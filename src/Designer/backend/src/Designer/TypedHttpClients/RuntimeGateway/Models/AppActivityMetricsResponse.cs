using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

public record AppActivityMetricsResponse(
    string Status,
    IReadOnlyDictionary<string, double> ActiveAppRequestCounts,
    int WindowDays,
    DateTimeOffset GeneratedAt
);
