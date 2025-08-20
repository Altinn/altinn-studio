namespace Altinn.Studio.Admin.Helpers;

public static class TaskUtilities
{
    public static async Task<(T1, T2)> WhenAll<T1, T2>(Task<T1> task1, Task<T2> task2)
    {
        await Task.WhenAll(task1, task2);
        return (await task1, await task2);
    }
}
