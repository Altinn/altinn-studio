namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal static class ReferenceSource
{
    public static string BindingOn(string bindingName, string owningComponentId) =>
        owningComponentId.Length == 0 ? bindingName : $"{bindingName} on component \"{owningComponentId}\"";

    public static string ReferencedFrom(string owningComponentId) =>
        owningComponentId.Length == 0 ? "" : $" (referenced from \"{owningComponentId}\")";
}
