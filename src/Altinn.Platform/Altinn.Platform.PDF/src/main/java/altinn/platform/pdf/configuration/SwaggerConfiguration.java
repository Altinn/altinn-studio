package altinn.platform.pdf.configuration;

import altinn.platform.pdf.services.BasicLogger;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.paths.RelativePathProvider;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import javax.servlet.ServletContext;
import java.util.logging.Level;

@Configuration
@EnableSwagger2
public class SwaggerConfiguration {
  @Bean
  public Docket api(ServletContext servletContext) {
    return new Docket(DocumentationType.SWAGGER_2)
      .pathProvider(new RelativePathProvider(servletContext) {
      @Override
      public String getApplicationBasePath() {
        return "pdf" + super.getApplicationBasePath();
      }
      })
      .host(System.getenv("SWAGGER_BASE_URL"))
      .select()
      .apis(RequestHandlerSelectors.basePackage("altinn.platform.pdf"))
      .paths(PathSelectors.any())
      .build()
      .apiInfo(apiInfo());
  }

  private ApiInfo apiInfo() {
    return new ApiInfoBuilder()
      .title("Altinn PDF")
      .description("API for creating a receipt pdf for an archived altinn app. ")
      .build();
  }
}
