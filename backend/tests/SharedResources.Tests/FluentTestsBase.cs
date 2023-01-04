namespace SharedResources.Tests;

/// <summary>
/// Base class for fluent tests.
/// </summary>
/// <typeparam name="T"></typeparam>
public class FluentTestsBase<T>
    where T : class
{
    protected T Given => this as T;

    protected T That => this as T;

    protected T And => this as T;

    protected T When => this as T;

    protected T Then => this as T;

    protected T But => this as T;
}
