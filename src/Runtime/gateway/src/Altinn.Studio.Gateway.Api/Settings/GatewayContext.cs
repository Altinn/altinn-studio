namespace Altinn.Studio.Gateway.Api.Settings;

internal sealed class GatewayContext
{
    public string AzureSubscriptionId { get; set; } = "";
    public string ServiceOwner { get; set; } = "";
    public string UpgradeChannel { get; set; } = "";
    public string Environment { get; set; } = "";
}
