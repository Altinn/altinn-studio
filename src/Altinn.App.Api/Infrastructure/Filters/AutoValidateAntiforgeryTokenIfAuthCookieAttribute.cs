#nullable disable
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Infrastructure.Filters;

/// <summary>
/// This attribute is part of the anti request forgery system.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public class AutoValidateAntiforgeryTokenIfAuthCookieAttribute : Attribute, IFilterFactory, IOrderedFilter
{
    /// <summary>
    /// Gets the order value for determining the order of execution of filters. Filters execute in
    /// ascending numeric value of the <see cref="Order"/> property.
    /// </summary>
    /// <remarks>
    /// <p>Filters are executed in a sequence determined by an ascending sort of the <see cref="Order"/> property.</p>
    /// <p>The default Order for this attribute is 1000 because it must run after any filter which does authentication
    /// or login in order to allow them to behave as expected (ie Unauthenticated or Redirect instead of 400).</p>
    /// <p>Look at <see cref="IOrderedFilter.Order"/> for more detailed info.</p>
    /// </remarks>
    public int Order { get; set; } = 1000;

    /// <inheritdoc />
    public bool IsReusable => true;

    /// <inheritdoc />
    public IFilterMetadata CreateInstance(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter>();
    }
}
