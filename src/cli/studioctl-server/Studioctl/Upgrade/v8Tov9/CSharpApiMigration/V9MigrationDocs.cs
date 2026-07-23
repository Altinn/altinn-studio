namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Central list of documentation links referenced by the v8-&gt;v9 C# API migration warnings, kept in
/// one place so they are easy to keep current. (The build-time analyzer errors ALTINNAPP0600/0601
/// historically linked to 404 pages - see issue #19419; the working guides are below.)
/// </summary>
internal static class V9MigrationDocs
{
    /// <summary>Guide for generating PDFs with a PDF service task (replaces <c>enablePdfCreation</c>).</summary>
    public const string Pdf = "https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/pdf";

    /// <summary>Guide for configuring eFormidling on a BPMN eFormidling service task.</summary>
    public const string EFormidlingServiceTask =
        "https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/eformidling/service-task/";
}
