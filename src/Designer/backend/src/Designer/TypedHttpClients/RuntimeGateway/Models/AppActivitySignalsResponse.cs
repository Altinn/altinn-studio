using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

public record AppActivitySignalsResponse(
    string Status,
    int WindowDays,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<AppActivitySignals> Apps
);

public record AppActivitySignals(string App, IReadOnlyList<AppActivitySignal> Signals);

public record AppActivitySignal(string Category, double Count, DateTimeOffset? LastSeenAt);
