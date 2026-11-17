using Xunit;

namespace Designer.Tests.Fixtures;

// OpenTelemetry listens to activity sources and meters across the whole process, so the in-memory exporters also
// receive the spans and metrics of every other test host that runs at the same time.
[CollectionDefinition(nameof(OpenTelemetryTestsCollection), DisableParallelization = true)]
public class OpenTelemetryTestsCollection { }
