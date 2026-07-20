using Altinn.Studio.AppConfig.Validation.Rules.Completeness;
using Altinn.Studio.AppConfig.Validation.Rules.Cross;
using Altinn.Studio.AppConfig.Validation.Rules.Meta;
using Altinn.Studio.AppConfig.Validation.Rules.Ref;
using Altinn.Studio.AppConfig.Validation.Rules.Shape;
using Altinn.Studio.AppConfig.Validation.Rules.Unique;

namespace Altinn.Studio.AppConfig.Validation;

internal static class RuleRegistry
{
    private static readonly IReadOnlyList<IValidationRule> _rules = Sort([
        new MultilingualCompletenessRule(),
        new TextResourceCoverageRule(),
        new UnusedLayoutFolderRule(),
        new CrossPolicyAppMatchesMetadataRule(),
        new CrossTaskHasDataTypeRule(),
        new GroupChildPageRule(),
        new RepGroupChildIndexRule(),
        new AppVersionSupportedRule(),
        new ParserCoverageGapRule(),
        new SyntaxValidRule(),
        new RefCSharpTypeRule(),
        new RefDataModelPathRule(),
        new RefDataTypeIdRule(),
        new RefLayoutComponentIdRule(),
        new RefLayoutSetRule(),
        new RefOptionsIdRule(),
        new RefPageFileRule(),
        new RefTaskIdRule(),
        new RefTextResourceKeyRule(),
        new BindingKindRule(),
        new DataTypeCountRule(),
        new LayoutSetFormDataTypeRule(),
        new ProcessTaskTypeRule(),
        new SelectionOptionsRule(),
        new ShapeAppIdRule(),
        new UniqueComponentIdRule(),
        new UniqueDataTypeIdRule(),
        new UniquePageInOrderRule(),
    ]);

    public static IReadOnlyList<IValidationRule> All() => _rules;

    private static IValidationRule[] Sort(IValidationRule[] rules)
    {
        Array.Sort(rules, (a, b) => string.CompareOrdinal(a.Metadata.Id, b.Metadata.Id));
        return rules;
    }
}
