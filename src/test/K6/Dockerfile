FROM loadimpact/k6
COPY . .
RUN k6 run src/Tests/Platform/profile.js 
RUN k6 run src/Tests/Platform/register.js
RUN k6 run src/Tests/Platform/authorization.js