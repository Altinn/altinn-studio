namespace Altinn.Studio.Designer.Hubs.SyncHub;

public record SyncError(string ErrorCode, ErrorSource Source, string Details);

