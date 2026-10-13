namespace Altinn.Studio.Assistant.Runner.Tests;

internal sealed class FakeJobRunner : IJobRunner
{
    public Func<JobCommand, byte[], Task<JobOutcome>> Run { get; set; } =
        (_, _) => Task.FromResult<JobOutcome>(new JobResult(0, false, "", "", null));

    public List<(JobCommand Command, byte[] Archive)> Calls { get; } = [];

    public async Task<JobOutcome> RunAsync(JobCommand command, Stream archive, CancellationToken cancellationToken)
    {
        using var copy = new MemoryStream();
        await archive.CopyToAsync(copy, cancellationToken);
        Calls.Add((command, copy.ToArray()));
        return await Run(command, copy.ToArray());
    }
}
