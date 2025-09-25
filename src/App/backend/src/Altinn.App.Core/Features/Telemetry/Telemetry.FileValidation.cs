using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartFileValidateActivity() => ActivitySource.StartActivity("FileValidatorService.Validate");
}
