FROM loadimpact/k6
COPY . .
RUN k6 run --vus ${vus} --duration ${duration} src/Tests/Platform/profile.js -e env=${env} -e org=${org} -e level2app=${level2app} -e username=${username} -e userpwd=${userpwd}
RUN k6 run --vus ${vus} --duration ${duration} src/Tests/Platform/register.js -e env=${env} -e org=${org} -e level2app=${level2app} -e username=${username} -e userpwd=${userpwd}
RUN k6 run --vus ${vus} --duration ${duration} src/Tests/Platform/authorization.js -e env=${env} -e org=${org} -e level2app=${level2app} -e testapp=${testapp} -e username=${username} -e userpwd=${userpwd} 
RUN k6 run --vus ${vus} --duration ${duration} src/Tests/Platform/pdf.js -e env=${env}

RUN k6 run --vus ${vus} --duration ${duration} src/Tests/Storage/applications.js -e env=${env} -e org=${org} -e level2app=${level2app} -e testapp=${testapp} -e username=${username} -e userpwd=${userpwd} 