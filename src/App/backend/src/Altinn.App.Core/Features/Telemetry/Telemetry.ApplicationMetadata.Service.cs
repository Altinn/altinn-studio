using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.ApplicationMetadataService;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetTextActivity() => ActivitySource.StartActivity($"{Prefix}.GetText");

    internal Activity? StartGetApplicationActivity() => ActivitySource.StartActivity($"{Prefix}.GetApplication");

    internal Activity? StartGetModelJsonSchemaActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetModelJsonSchema");

    internal Activity? StartGetPrefillJsonActivity() => ActivitySource.StartActivity($"{Prefix}.GetPrefillJson");

    internal Activity? StartGetLayoutsActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayouts");

    internal Activity? StartGetLayoutSetActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayoutSet");

    internal Activity? StartGetLayoutSetsActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayoutSets");

    internal Activity? StartGetLayoutsForSetActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayoutsForSet");

    internal Activity? StartGetLayoutSetsForTaskActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetLayoutSetsForTask");

    internal Activity? StartGetLayoutSettingsActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayoutSettings");

    internal Activity? StartGetLayoutSettingsStringActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetLayoutSettingsString");

    internal Activity? StartGetLayoutSettingsForSetActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetLayoutSettingsForSet");

    internal Activity? StartGetLayoutSettingsStringForSetActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetLayoutSettingsStringForSet");

    internal Activity? StartGetTextsActivity() => ActivitySource.StartActivity($"{Prefix}.GetTexts");

    internal Activity? StartGetRuleConfigurationForSetActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetRuleConfigurationForSet");

    internal Activity? StartGetRuleHandlerForSetActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetRuleHandlerForSet");

    internal Activity? StartGetFooterActivity() => ActivitySource.StartActivity($"{Prefix}.GetFooter");

    internal Activity? StartGetValidationConfigurationActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetValidationConfiguration");

    internal Activity? StartGetLayoutModelActivity() => ActivitySource.StartActivity($"{Prefix}.GetLayoutModel");

    internal Activity? StartGetClassRefActivity() => ActivitySource.StartActivity($"{Prefix}.GetClassRef");

    internal Activity? StartClientGetApplicationXACMLPolicyActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetXACMLPolicy");

    internal Activity? StartClientGetApplicationBPMNProcessActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetBPMNProcess");

    internal static class ApplicationMetadataService
    {
        internal const string Prefix = "ApplicationMetadata.Service";
    }
}
