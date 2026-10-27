using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class NeverRenderedTexts
{
    private const string ComponentPointerPrefix = "/data/layout/";
    private const string RequiredValidationBinding = "/textResourceBindings/requiredValidation";
    private const string ShortNameBinding = "/textResourceBindings/shortName";
    private const string TableTitleBinding = "/textResourceBindings/tableTitle";

    private readonly Dictionary<(string File, string Pointer), LayoutComponent> _components = new();
    private readonly HashSet<(string LayoutSet, string ComponentId)> _repeatingGroupChildren = new();

    public NeverRenderedTexts(AppModel app)
    {
        foreach (var component in app.LayoutSets.SelectMany(s => s.AllComponents))
        {
            _components.TryAdd((component.Position.File, component.Position.Pointer), component);
            if (component.Type == "RepeatingGroup")
                foreach (var child in component.Children)
                    _repeatingGroupChildren.Add((component.LayoutSet, child));
        }
    }

    public bool Contains(SourceSpan position)
    {
        var pointer = position.Pointer;
        if (!pointer.StartsWith(ComponentPointerPrefix, StringComparison.Ordinal))
            return false;
        var end = pointer.IndexOf('/', ComponentPointerPrefix.Length);
        if (end < 0 || !_components.TryGetValue((position.File, pointer[..end]), out var component))
            return false;
        if (component.AlwaysHidden)
            return true;
        var property = pointer[end..];
        if (Within(property, RequiredValidationBinding) || Within(property, ShortNameBinding))
            return component.NeverRequired;
        return Within(property, TableTitleBinding)
            && !_repeatingGroupChildren.Contains((component.LayoutSet, component.Id));
    }

    private static bool Within(string property, string binding) =>
        property.StartsWith(binding, StringComparison.Ordinal)
        && (property.Length == binding.Length || property[binding.Length] == '/');
}
