using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;

internal sealed class LayoutUpgrader
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly LayoutMutator _layoutMutator;
    private readonly bool _convertGroupTitles;

    public LayoutUpgrader(string uiFolder, bool convertGroupTitles)
    {
        _layoutMutator = new LayoutMutator(uiFolder);
        _convertGroupTitles = convertGroupTitles;
    }

    public IList<string> GetWarnings()
    {
        return _warnings.Concat(_layoutMutator.GetWarnings()).Distinct().ToList();
    }

    /**
     * The order of mutators is important, it will do one mutation on all files before moving on to the next
     */
    public void Upgrade()
    {
        _layoutMutator.ReadAllLayoutFiles();
        _layoutMutator.Mutate(new AddressMutator());
        _layoutMutator.Mutate(new LikertMutator());
        _layoutMutator.Mutate(new RepeatingGroupMutator());
        _layoutMutator.Mutate(new GroupMutator());
        _layoutMutator.Mutate(new TriggerMutator());
        _layoutMutator.Mutate(new TrbMutator(_convertGroupTitles));
        _layoutMutator.Mutate(new AttachmentListMutator());
        _layoutMutator.Mutate(new PropertyCleanupMutator());
    }

    public async Task Write()
    {
        await _layoutMutator.WriteAllLayoutFiles();
    }
}
