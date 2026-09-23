# ============================================================
# PocketBox API (.NET 10)
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY PocketBox.Api/PocketBox.Api.csproj PocketBox.Api/

RUN dotnet restore PocketBox.Api/PocketBox.Api.csproj

COPY . .

RUN dotnet publish PocketBox.Api/PocketBox.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:4111 \
    ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

EXPOSE 4111

ENTRYPOINT ["dotnet", "PocketBox.Api.dll"]