服务器开发
在本教程中，我们将构建一个简单的MCP天气服务器并将其连接到宿主应用程序Claude桌面版。我们将从基本设置开始，然后逐步进行到更复杂的用例。

我们将构建什么 
许多大语言模型（包括Claude）目前没有获取天气预报和严重天气警报的能力。让我们使用MCP来解决这个问题！

我们将构建一个服务器，提供两个工具：get-alerts和get-forecast。然后我们将服务器连接到MCP宿主应用程序（在本例中是Claude桌面版）：

天气警报工具演示
当前天气工具演示
服务器可以连接到任何客户端。我们在这里选择Claude桌面版是为了简单起见，但我们也有关于构建自己的客户端的指南以及其他客户端列表。
因为服务器是本地运行的，MCP目前只支持桌面宿主应用程序。远程宿主应用程序正在积极开发中。
MCP核心概念 
MCP服务器可以提供三种主要类型的功能：

资源：类似文件的数据，可以被客户端读取（如API响应或文件内容）
工具：可以被大语言模型调用的函数（需要用户批准）
提示：预先编写的模板，帮助用户完成特定任务
本教程将主要关注工具。

让我们开始构建我们的天气服务器！您可以在这里找到我们将要构建的完整代码。

前提知识 
本快速入门假设您熟悉：

Node.js
像Claude这样的大语言模型
系统要求 
安装Node.js 18或更高版本
您必须使用Node.js MCP SDK 1.2.0或更高版本
设置您的环境 
首先，让我们创建一个新的Node.js项目：

创建项目
# 创建一个新目录
mkdir weather
cd weather

# 初始化项目
npm init -y

# 安装依赖
npm install @mcp/node node-fetch

# 创建我们的服务器文件
touch weather.js

现在让我们开始构建您的服务器。

构建您的服务器 
导入包并设置实例 
将这些添加到您的weather.js顶部：

const { MCPServer } = require('@mcp/node');
const fetch = require('node-fetch');

// 初始化MCP服务器
const mcp = new MCPServer('weather');

// 常量
const NWS_API_BASE = 'https://api.weather.gov';
const USER_AGENT = 'weather-app/1.0';

辅助函数 
接下来，让我们添加我们的辅助函数，用于查询和格式化来自国家气象服务API的数据：

async function makeNWSRequest(url) {
    const headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/geo+json'
    };
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        return null;
    }
}

function formatAlert(feature) {
    const props = feature.properties;
    return `
Event: ${props.event || 'Unknown'}
Area: ${props.areaDesc || 'Unknown'}
Severity: ${props.severity || 'Unknown'}
Description: ${props.description || 'No description available'}
Instructions: ${props.instruction || 'No specific instructions provided'}
`;
}

实现工具执行 
工具执行处理程序负责实际执行每个工具的逻辑。让我们添加它：

// 获取警报工具
mcp.tool({
    name: 'get-alerts',
    description: '获取美国州的天气警报',
    parameters: {
        state: {
            type: 'string',
            description: '两字母美国州代码（例如CA、NY）'
        }
    },
    async execute({ state }) {
        const url = `${NWS_API_BASE}/alerts/active/area/${state}`;
        const data = await makeNWSRequest(url);

        if (!data || !data.features) {
            return '无法获取警报或未找到警报。';
        }

        if (data.features.length === 0) {
            return '该州没有活动警报。';
        }

        const alerts = data.features.map(formatAlert);
        return alerts.join('\n---\n');
    }
});

// 获取预报工具
mcp.tool({
    name: 'get-forecast',
    description: '获取位置的天气预报',
    parameters: {
        latitude: {
            type: 'number',
            description: '位置的纬度'
        },
        longitude: {
            type: 'number',
            description: '位置的经度'
        }
    },
    async execute({ latitude, longitude }) {
        // 首先获取预报网格端点
        const pointsUrl = `${NWS_API_BASE}/points/${latitude},${longitude}`;
        const pointsData = await makeNWSRequest(pointsUrl);

        if (!pointsData) {
            return '无法为此位置获取预报数据。';
        }

        // 从点响应中获取预报URL
        const forecastUrl = pointsData.properties.forecast;
        const forecastData = await makeNWSRequest(forecastUrl);

        if (!forecastData) {
            return '无法获取详细预报。';
        }

        // 将时段格式化为可读预报
        const periods = forecastData.properties.periods;
        const forecasts = periods.slice(0, 5).map(period => `
${period.name}:
Temperature: ${period.temperature}°${period.temperatureUnit}
Wind: ${period.windSpeed} ${period.windDirection}
Forecast: ${period.detailedForecast}
`);

        return forecasts.join('\n---\n');
    }
});

运行服务器 
最后，让我们初始化并运行服务器：

// 初始化并运行服务器
mcp.start();

您的服务器已完成！运行node weather.js以确认一切正常工作。

现在让我们使用现有的MCP宿主应用程序Claude桌面版测试您的服务器。

使用Claude桌面版测试您的服务器 
Claude桌面版尚未在Linux上可用。Linux用户可以继续学习构建客户端教程，以构建连接到我们刚刚构建的服务器的MCP客户端。
首先，确保您已安装Claude桌面版。您可以在这里安装最新版本。 如果您已经安装了Claude桌面版，请确保它已更新到最新版本。

我们需要为您想要使用的任何MCP服务器配置Claude桌面版。为此，请在文本编辑器中打开您的Claude桌面版应用程序配置文件，位于~/Library/Application Support/Claude/claude_desktop_config.json。如果该文件不存在，请创建它。

例如，如果您已安装VS Code：

打开配置文件
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

code $env:AppData\Claude\claude_desktop_config.json

然后您将在mcpServers键中添加您的服务器。只有在至少一个服务器正确配置的情况下，MCP UI元素才会在Claude桌面版中显示。

在这种情况下，我们将添加我们的单个天气服务器，如下所示：

配置Claude桌面版
{
    "mcpServers": {
        "weather": {
            "command": "node",
            "args": [
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather/weather.js"
            ]
        }
    }
}

{
    "mcpServers": {
        "weather": {
            "command": "node",
            "args": [
                "C:\\ABSOLUTE\\PATH\\TO\\PARENT\\FOLDER\\weather\\weather.js"
            ]
        }
    }
}

确保您传入服务器的绝对路径。
这告诉Claude桌面版：

有一个名为"weather"的MCP服务器
使用node命令运行该服务器
使用weather.js作为入口点
现在，重启Claude桌面版。您应该会在工具栏中看到一个新的MCP图标。点击它，您将看到我们的天气工具！

下一步 
恭喜！您已经成功构建了您的第一个MCP服务器。这只是开始 - 您可以：

了解如何构建客户端
探索服务器API参考
查看示例和模板
测试命令 
让我们确认Claude桌面端能正确识别天气服务中的两个工具。注意查看锤子图标

MCP工具图标
：
MCP工具视觉指示器
点击锤子图标后应该看到两个工具：

可用MCP工具
如果工具未显示，请参考故障排除章节。

成功显示工具后，可以在Claude桌面端测试以下命令：

萨克拉门托的天气如何？
德克萨斯州有哪些活跃的天气警报？
当前天气示例
天气警报示例
该服务使用美国国家气象局数据，仅支持美国地区查询。
底层工作原理 
问题处理流程：

客户端将问题发送给Claude
Claude分析可用工具并选择使用
通过MCP服务器执行工具
返回结果给Claude
Claude生成自然语言响应
向用户展示最终结果
故障排除 
获取桌面端日志

日志文件位于~/Library/Logs/Claude：

mcp.log 包含MCP连接日志
mcp-server-SERVERNAME.log 包含指定服务器的错误日志
实时查看日志命令：

tail -n 20 -f ~/Library/Logs/Claude/mcp*.log

服务器未显示

检查claude_desktop_config.json文件语法
确认项目使用绝对路径
完全重启Claude桌面端
工具调用静默失败

检查Claude日志
验证服务器能否正常启动
尝试重启Claude桌面端
错误：无法获取网格点数据 可能原因：

坐标不在美国境内
NWS API服务异常
触发速率限制
解决方案：

确认使用美国坐标
增加请求间隔时间
查看NWS API状态页