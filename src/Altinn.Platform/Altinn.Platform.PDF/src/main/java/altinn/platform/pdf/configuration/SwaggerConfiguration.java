package altinn.platform.pdf.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

@Configuration
@EnableSwagger2
public class SwaggerConfiguration {
  @Bean
  public Docket api() {
    String host;
    if (System.getenv("SWAGGER_BASE_URL") != null) {
      host = System.getenv("SWAGGER_BASE_URL");
    } else {
      host = "localhost:5070";
    }

    return new Docket(DocumentationType.SWAGGER_2)
      .host(host)
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
