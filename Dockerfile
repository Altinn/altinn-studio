FROM node:9.5.0 AS generate-ux-editor
COPY /src/react-apps/ux-editor .
#RUN npm install webpack webpack-cli -g
#WORKDIR /t30/src/react-apps/ux-editor
#RUN npm install
#WORKDIR /t30/src/AltinnCore/Designer
#RUN npm install
#WORKDIR /t30/src/react-apps/ux-editor
RUN npm install
RUN npm run build
#COPY . /build-context
#WORKDIR /build-context/src/react-apps/ux-editor
RUN ls


FROM node:9.5.0 AS generate-desiger-js
COPY /src/AltinnCore/Designer .
RUN npm install
RUN npm run gulp build


FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
COPY /src .
RUN ls
COPY --from=generate-desiger-js /wwwroot .
COPY --from=generate-ux-editor ./dist/*.js /src/AltinnCore/Designer/wwwroot/designer/js/formbuilder/
COPY --from=generate-ux-editor ./dist/*.css /src/AltinnCore/Designer/wwwroot/designer/css/
RUN dotnet build AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output

FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Designer.dll"]