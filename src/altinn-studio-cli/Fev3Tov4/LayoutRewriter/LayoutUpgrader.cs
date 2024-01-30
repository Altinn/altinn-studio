using Altinn.Studio.Cli.Fev3Tov4.LayoutRewriter.Mutators;

namespace Altinn.Studio.Cli.Fev3Tov4.LayoutRewriter;

class LayoutUpgrader
{
    private readonly IList<string> warnings = new List<string>();
    private readonly LayoutMutator layoutMutator;
    private readonly bool preserveDefaultTriggers;
    private readonly bool convertGroupTitles;

    public LayoutUpgrader(string uiFolder, bool preserveDefaultTriggers, bool convertGroupTitles)
    {
        this.layoutMutator = new LayoutMutator(uiFolder);
        this.preserveDefaultTriggers = preserveDefaultTriggers;
        this.convertGroupTitles = convertGroupTitles;
    }

    public IList<string> GetWarnings()
    {
        return warnings.Concat(layoutMutator.GetWarnings()).Distinct().ToList();
    }

    /**
     * The order of mutators is important, it will do one mutation on all files before moving on to the next
     */
    public void Upgrade()
    {
        layoutMutator.ReadAllLayoutFiles();
        // layoutMutator.Mutate(new AddressMutator());
        layoutMutator.Mutate(new LikertMutator());
        layoutMutator.Mutate(new RepeatingGroupMutator());
        layoutMutator.Mutate(new GroupMutator());
        layoutMutator.Mutate(new TriggerMutator(this.preserveDefaultTriggers));
        layoutMutator.Mutate(new TrbMutator(this.convertGroupTitles));
        layoutMutator.Mutate(new AttachmentListMutator());
        layoutMutator.Mutate(new PropertyCleanupMutator());
    }

    public async Task Write()
    {
        await layoutMutator.WriteAllLayoutFiles();
    }
}
