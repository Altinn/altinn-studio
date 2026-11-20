namespace Altinn.Studio.Fleet;

/// <summary>An Altinn Studio installation that apps are released from.</summary>
/// <param name="Name">The name studioctl gives the installation's environment, such as <c>prod</c>.</param>
/// <param name="HostName">The host name, such as <c>altinn.studio</c>.</param>
public sealed record StudioHost(string Name, HostName HostName)
{
    /// <summary>Returns the host name.</summary>
    public override string ToString() => HostName.Value;
}
