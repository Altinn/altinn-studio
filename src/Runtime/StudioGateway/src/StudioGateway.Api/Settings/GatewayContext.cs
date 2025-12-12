namespace StudioGateway.Api.Settings;

internal sealed class GatewayContext
{
    public string ServiceOwner { get; set; } = "";
    public string UpgradeChannel { get; set; } = "";
    public string Environment { get; set; } = "";
}
