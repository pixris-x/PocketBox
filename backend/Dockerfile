# ============================================================
# PocketBox API (.NET 10) — 多阶段构建
# 阶段 1：SDK 镜像还原并发布
# 阶段 2：ASP.NET 运行时镜像，只带发布产物与离线 IP 库
#
# 构建上下文为 backend/，因为 PocketBox.Api.csproj 通过 ..\data\ 引用离线库，
# 该目录正好落在 backend/data/ 内，上下文自包含、无需提升到仓库根。
# ============================================================

# ---------- 构建阶段 ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# 先只复制 csproj，让还原结果能命中 Docker 层缓存
COPY PocketBox.Api/PocketBox.Api.csproj PocketBox.Api/
RUN dotnet restore PocketBox.Api/PocketBox.Api.csproj

COPY . .
RUN dotnet publish PocketBox.Api/PocketBox.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---------- 运行阶段 ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# curl 仅用于容器健康检查（基础镜像不自带）
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_ENVIRONMENT=Production

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "PocketBox.Api.dll"]
