namespace Altinn.App.Ai.Enrichment.Tests.Helpers;

/// <summary>
/// Locates test fixtures copied to the output directory. The demo agent folder
/// is a complete, fictional agent configuration (a municipal meeting-room
/// booking application) that exercises both step types and all ten built-in
/// tools — it doubles as the reference example of a valid agent folder.
/// </summary>
public static class TestPaths
{
    public static string TestDataRoot => Path.Combine(AppContext.BaseDirectory, "TestData");

    public static string DemoAgentRoot => Path.Combine(TestDataRoot, "agents", "demo");

    public static string DemoRegistries => Path.Combine(DemoAgentRoot, "registries");

    public static string DemoTemplates => Path.Combine(DemoAgentRoot, "templates");

    public static string ApplicationsRoot => Path.Combine(TestDataRoot, "applications");
}
