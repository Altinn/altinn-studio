### Eid logger


## Local development

Application uses private pacakges and access needs to be configured in order to build locally.

Steps:
- copy settings.xml.template in ~/.m2/settings.xml on local machine
- set the username and password in the file. password should be the PAT token created in github

After credentials setup run the
```shell
./mvnw clean install -DskipTests
```
to build the application. <br/>
And run the
```shell
./mvnw spring-boot:run
```
to run the application.


Swagger documentation will be available on [link](http://localhost:8080/swagger-ui/index.html).

Docker build is using maven wrapper. To update maven version use command
```shell
./mvnw -N wrapper:wrapper -Dmaven=<<version-here>>
```

### Running in the compose file.
- set the GITHUB_USER and the GITHUB_PASSWORD variables in the .env file
- run docker compose up -d command

for example

```text
GITHUB_USER=dummyUser
GITHUB_PASSWORD=githubToken
```
