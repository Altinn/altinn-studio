namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeStatus(
    string? BackendVersion,
    string? FrontendVersion,
    int TargetMajorVersion,
    bool IsUpgradeAvailable,
    bool IsAutomaticUpgradeSupported,
    bool HasCustomCode
);
