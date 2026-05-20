namespace Altinn.App.Integration.Tests;

internal static class IntegrationTestCollections
{
    public const string Pdf = "PDF integration tests";
}

[CollectionDefinition(IntegrationTestCollections.Pdf)]
public sealed class PdfIntegrationTestCollection;
