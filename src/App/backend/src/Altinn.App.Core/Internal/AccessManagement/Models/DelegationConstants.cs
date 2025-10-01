namespace Altinn.App.Core.Internal.AccessManagement.Models;

internal static class DelegationConst
{
    internal const string Resource = "urn:altinn:resource";
    internal const string App = "urn:altinn:app";
    internal const string Org = "urn:altinn:org";
    internal const string Task = "urn:altinn:task";
    internal const string ActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    internal const string Party = "urn:altinn:party:uuid";
}

internal static class ActionType
{
    internal const string Write = "write";
    internal const string Read = "read";
    internal const string Sign = "sign";
}
