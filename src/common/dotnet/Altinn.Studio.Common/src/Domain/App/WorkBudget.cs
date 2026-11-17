namespace Altinn.Studio.Common.Domain.App;

// What reading may cost before it stops. App repositories are written by others, so a reader does a bounded amount
// of work whatever it is given.
internal sealed class WorkBudget(int work)
{
    private int _remaining = work;

    public bool IsSpent => _remaining <= 0;

    // Takes the cost from what is left, or returns false and leaves nothing when there is not enough.
    public bool Spend(int cost)
    {
        if (cost < 0 || cost >= _remaining)
        {
            _remaining = 0;
            return false;
        }

        _remaining -= cost;
        return true;
    }
}
