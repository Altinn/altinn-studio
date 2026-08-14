using Altinn.Studio.Designer.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace Designer.Tests.Infrastructure;

public class MvcConfigurationTests
{
    [Fact]
    public void ConfigureMvc_DoesNotRegisterXmlFormatters()
    {
        var services = new ServiceCollection();
        services.ConfigureMvc();
        using ServiceProvider serviceProvider = services.BuildServiceProvider();

        MvcOptions options = serviceProvider.GetRequiredService<IOptions<MvcOptions>>().Value;

        Assert.DoesNotContain(options.InputFormatters, formatter => formatter is XmlSerializerInputFormatter);
        Assert.DoesNotContain(options.OutputFormatters, formatter => formatter is XmlSerializerOutputFormatter);
    }
}
