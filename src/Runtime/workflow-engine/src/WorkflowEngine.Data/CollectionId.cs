namespace WorkflowEngine.Data;

/// <summary>
/// Names one workflow collection. <paramref name="Namespace"/> is normalized, as the database stores it.
/// </summary>
internal readonly record struct CollectionId(string Namespace, string Key);
