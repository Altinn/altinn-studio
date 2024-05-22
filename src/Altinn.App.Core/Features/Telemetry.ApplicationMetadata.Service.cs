using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.ApplicationMetadataService;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetTextActivity() => ActivitySource.StartActivity($"{_prefix}.GetText");

    internal Activity? StartGetApplicationActivity() => ActivitySource.StartActivity($"{_prefix}.GetApplication");

    internal Activity? StartGetModelJsonSchemaActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetModelJsonSchema");

    internal Activity? StartGetPrefillJsonActivity() => ActivitySource.StartActivity($"{_prefix}.GetPrefillJson");

    internal Activity? StartGetLayoutsActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayouts");

    internal Activity? StartGetLayoutSetActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayoutSet");

    internal Activity? StartGetLayoutSetsActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayoutSets");

    internal Activity? StartGetLayoutsForSetActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayoutsForSet");

    internal Activity? StartGetLayoutSetsForTaskActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetLayoutSetsForTask");

    internal Activity? StartGetLayoutSettingsActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayoutSettings");

    internal Activity? StartGetLayoutSettingsStringActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetLayoutSettingsString");

    internal Activity? StartGetLayoutSettingsForSetActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetLayoutSettingsForSet");

    internal Activity? StartGetLayoutSettingsStringForSetActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetLayoutSettingsStringForSet");

    internal Activity? StartGetTextsActivity() => ActivitySource.StartActivity($"{_prefix}.GetTexts");

    internal Activity? StartGetRuleConfigurationForSetActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetRuleConfigurationForSet");

    internal Activity? StartGetRuleHandlerForSetActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetRuleHandlerForSet");

    internal Activity? StartGetFooterActivity() => ActivitySource.StartActivity($"{_prefix}.GetFooter");

    internal Activity? StartGetValidationConfigurationActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetValidationConfiguration");

    internal Activity? StartGetLayoutModelActivity() => ActivitySource.StartActivity($"{_prefix}.GetLayoutModel");

    internal Activity? StartGetClassRefActivity() => ActivitySource.StartActivity($"{_prefix}.GetClassRef");

    internal Activity? StartClientGetApplicationXACMLPolicyActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetXACMLPolicy");

    internal Activity? StartClientGetApplicationBPMNProcessActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetBPMNProcess");

    internal static class ApplicationMetadataService
    {
        internal const string _prefix = "ApplicationMetadata.Service";
    }
}
