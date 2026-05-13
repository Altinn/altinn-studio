using Spectre.Console;
using Spectre.Console.Rendering;

namespace Altinn.Analysis;

internal sealed class ValueProgressColumn : ProgressColumn
{
    public override IRenderable Render(
        RenderOptions options,
        ProgressTask task,
        TimeSpan deltaTime
    ) =>
        new Markup($"{task.Value}/{task.MaxValue}")
            .Overflow(Overflow.Ellipsis)
            .Justify(Justify.Right);
}
