using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;

public sealed record AppUpgradeEngineResponse(
    string Message,
    int ExitCode,
    string Output,
    string Error,
    IReadOnlyList<AppUpgradeEngineStep> Steps
);

public sealed record AppUpgradeEngineStep(string Name, IReadOnlyList<AppUpgradeEngineMessage> Messages);

public sealed record AppUpgradeEngineMessage(string Text, string Status);
