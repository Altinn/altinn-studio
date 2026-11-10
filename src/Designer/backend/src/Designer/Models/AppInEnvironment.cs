using System.Collections.Generic;
using System.Runtime.Serialization;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Runtime;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// What runs of the app in one of the org's environments.
/// </summary>
public sealed class AppInEnvironment
{
    public required string Environment { get; init; }

    public required AppInEnvironmentState State { get; init; }

    /// <summary>
    /// The app as it runs, when it is <see cref="AppInEnvironmentState.Running"/>.
    /// </summary>
    public RunningApp? RunningApp { get; init; }

    /// <param name="state">What runs of the app in the environment.</param>
    /// <param name="deployments">This Studio environment's deploys of the app, in any order.</param>
    public static AppInEnvironment From(AppRunState state, IEnumerable<DeploymentEntity> deployments) =>
        state switch
        {
            AppRunState.Running running => new()
            {
                Environment = running.Environment,
                State = AppInEnvironmentState.Running,
                RunningApp = RunningApp.From(running, deployments),
            },
            AppRunState.NotRunning => new()
            {
                Environment = state.Environment,
                State = AppInEnvironmentState.NotRunning,
            },
            _ => new() { Environment = state.Environment, State = AppInEnvironmentState.Unknown },
        };
}

public enum AppInEnvironmentState
{
    [EnumMember(Value = "running")]
    Running,

    [EnumMember(Value = "notRunning")]
    NotRunning,

    /// <summary>
    /// The environment could not tell, such as when its runtime cluster is unreachable.
    /// </summary>
    [EnumMember(Value = "unknown")]
    Unknown,
}
