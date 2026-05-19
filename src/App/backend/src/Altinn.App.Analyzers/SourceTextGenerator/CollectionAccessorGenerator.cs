namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class CollectionAccessorGenerator
{
    internal static string GenerateAccessor(ModelPathNode node, string collectionName, string indexName) =>
        node.IsIndexableList
            ? $"{collectionName}[{indexName}]"
            : $"global::System.Linq.Enumerable.ElementAt({collectionName}, {indexName})";
}
