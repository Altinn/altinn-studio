namespace Altinn.Studio.Designer.Repository.Models;

/// <summary>
/// How many of a service owner's apps are deployed to an environment, by Designer's deployment history.
/// </summary>
/// <param name="Org">The service owner.</param>
/// <param name="Environment">The environment, by Designer's name for it.</param>
/// <param name="Count">The apps whose latest successful deployment there is a deploy rather than a decommission.</param>
public sealed record DeployedAppCount(string Org, string Environment, int Count);
