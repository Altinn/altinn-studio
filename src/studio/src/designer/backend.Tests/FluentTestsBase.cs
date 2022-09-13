using System;

namespace Designer.Tests;

/// <summary>
/// TODO: This is the same class as the one in the DataModeling.Tests project.
/// TODO: Create new project or externalize class in some common nuget package.
/// </summary>
/// <typeparam name="T"></typeparam>
[Obsolete("Move and merge with same class from Datamodeling.Tests")]
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
