namespace Altinn.Studio.Designer.Enums;

/// <summary>
/// Enum representation of the different types of resources supported by the resource registry
/// </summary>
public enum ResourceType
{

    Default = 0,

    Systemresource = 1 << 0,

    MaskinportenSchema = 1 << 1,

    Altinn2Service = 1 << 2,

    AltinnApp = 1 << 3,

    GenericAccessResource = 1 << 4,

    BrokerService = 1 << 5,

    CorrespondenceService = 1 << 6,

    Consent = 1 << 7,
}
