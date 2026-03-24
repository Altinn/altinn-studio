namespace Altinn.Studio.KubernetesWrapper.Configuration;

internal sealed class GeneralSettings
{
    public const string SectionName = "GeneralSettings";
    public const int MaxKubernetesRequestTimeoutSeconds = 10;

    public int CacheTtlSeconds { get; init; } = 5;

    public int KubernetesRequestTimeoutSeconds { get; init; } = MaxKubernetesRequestTimeoutSeconds;
}
