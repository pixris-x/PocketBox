using IP2Region.Net.Abstractions;
using IP2Region.Net.XDB;
using PocketBox.Api.Endpoints;
using PocketBox.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 离线 IP 归属地库：容器内由 Dockerfile 拷到 data/ 下，本地开发走 backend/data/
var databasePath =
    builder.Configuration["IpRegion:DatabasePath"]
    ?? Path.Combine(AppContext.BaseDirectory, "data", "ip2region_v4.xdb");
if (!File.Exists(databasePath))
{
    throw new FileNotFoundException($"未找到 IP 归属地库，请检查配置 IpRegion:DatabasePath：{databasePath}");
}

// Content 策略把整个 xdb 载入内存：官方 benchmark 里 53ns/次，VectorIndex 虽只占 512KiB
// 但要 4.4µs、慢约 80 倍。11MB 内存换微秒级查询，容器里很划算。Searcher 线程安全，注册为单例。
builder.Services.AddSingleton<ISearcher>(_ => new Searcher(CachePolicy.Content, databasePath));
builder.Services.AddSingleton<IpRegionService>();

// OpenAPI 文档（Swagger UI 的数据源）
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer(
        (document, _, _) =>
        {
            document.Info.Title = "PocketBox API";
            document.Info.Version = "v1";
            document.Info.Description = "口袋工具箱后端接口：IP 归属地查询与访客 IP 探测。";
            return Task.CompletedTask;
        }
    );
});

// 桌面端（Electron）页面源是自定义协议 app://pocketbox，访问线上 API 属跨源。
// 白名单只放行该 Origin 的 GET 请求；Web 端始终同源，不受 CORS 影响。
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("app://pocketbox").WithMethods("GET").WithHeaders("Accept")
    );
});

var app = builder.Build();

app.UseCors();

// Swagger UI 仅在开发环境启用：线上是公网服务，不该对外公开接口文档。
// 文档由内置的 Microsoft.AspNetCore.OpenApi 生成在 /openapi/v1.json，UI 由 Swashbuckle 提供，入口 /swagger
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "PocketBox API v1"));
}

app.MapIpEndpoints();

app.Run();
