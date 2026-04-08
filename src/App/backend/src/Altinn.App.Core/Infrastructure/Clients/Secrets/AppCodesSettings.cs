namespace Altinn.App.Core.Infrastructure.Clients.Secrets;

internal sealed class AppCodesSettings
{
    public List<AppCode> NotificationCallback { get; set; } = [];
}

internal sealed class AppCode
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateTimeOffset IssuedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
