import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 知识图谱API基础URL
const KG_API_BASE = "http://localhost:3000/api/kg";

// 创建服务器实例
const server = new Server({
  name: "knowledge-graph-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// 知识图谱概念介绍
const knowledgeGraphIntro = `
知识图谱记忆服务器
这是一个基于本地知识图谱实现的详细存储化记忆系统，记住小说或者剧本中的各种户相关xx核心概念
实体
实体是知识图谱中的主要节点。每个实体包含：

唯一名称（标识符）
实体类型（如"人物"、"组织"、"事件"）
观察项列表
属性（键值对）
示例：
{
"name": "张三",
"type": "人物",
"observations": [
  { "content": "能说流利的西班牙语", "timestamp": "...", "source": "..." }
],
"properties": { "age": 30 }
}

关系
关系定义了实体间的有向连接。关系始终以主动语态存储，描述实体间的互动或关联。

示例：
{
"source": "张三",
"target": "Anthropic公司",
"type": "就职于",
"properties": {}
}

观察项
观察项是关于实体的离散信息单元。它们具有以下特点：

以对象形式存储，至少包含content（字符串内容）
附加到特定实体
可独立添加或删除
应保持原子性（每个观察项只包含一个事实）
示例：
{
"entityName": "张三",
"observations": [
  { "content": "能说流利的西班牙语", "timestamp": "...", "source": "..." },
  { "content": "2019年毕业", "timestamp": "...", "source": "..." },
]
}
`;

// 工具处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_complete_graph",
        description: "获取知识图谱中的所有实体和关系数据。这个工具可以返回整个知识图谱，包括所有实体及其观察项、所有关系。当你需要全面了解当前知识图谱状态时使用。",
        inputSchema: {
          type: "object",
          properties: {},
        },
        introduction: knowledgeGraphIntro,
      },
      {
        name: "create_entities",
        description: "创建一个或多个新实体。实体是知识图谱的基本单位，代表人物、组织、地点、概念等。每个实体有唯一名称、类型和可选的观察项列表。可通过overwrite参数决定是否覆盖同名实体。",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "实体名称（必需），作为唯一标识符" },
                  type: { type: "string", description: "实体类型，如'人物'、'组织'、'地点'等" },
                  observations: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        content: { type: "string", description: "观察内容，应为原子化的单一事实信息" },
                        timestamp: { type: "string", description: "时间戳，记录观察添加的时间" },
                        source: { type: "string", description: "数据来源，记录观察的来源" }
                      },
                      required: ["content"]
                    },
                    description: "关于该实体的观察数组"
                  },
                  properties: { 
                    type: "object", 
                    description: "实体的附加属性，键值对形式" 
                  },
                  overwrite: { type: "boolean", description: "是否覆盖同名实体，默认为true" }
                },
                required: ["name"],
              },
            },
          },
          required: ["entities"],
        },
      },
      {
        name: "create_relations",
        description: "创建实体之间的关系。关系描述两个实体间的有向连接，总是以主动语态表示（如'认识'、'拥有'、'隶属于'）。关系包含源实体、目标实体和关系类型。可通过overwrite参数决定是否覆盖同类关系。",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { type: "string", description: "源实体名称，关系的起点" },
                  target: { type: "string", description: "目标实体名称，关系的终点" },
                  type: { type: "string", description: "关系类型，如'认识'、'拥有'、'工作于'等，应使用主动语态" },
                  properties: { type: "object", description: "关系的附加属性，可存储关系的额外信息" },
                  overwrite: { type: "boolean", description: "是否覆盖相同的源-目标-类型关系，默认为true" }
                },
                required: ["source", "target", "type"],
              },
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "add_observations",
        description: "向已有实体添加观察项。观察项是关于实体的原子化信息单元，每条观察应包含单一事实。这个工具可以向多个实体批量添加观察，每条观察可以包含时间戳和来源信息。",
        inputSchema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "实体名称，指定要添加观察的实体" },
                  content: { type: "string", description: "观察内容，应该是简洁明了的单一事实" },
                  timestamp: { type: "string", description: "时间戳，记录观察添加的时间，默认为当前时间" },
                  source: { type: "string", description: "数据来源，记录观察的来源，默认为'user'" },
                },
                required: ["entityName", "content"],
              },
            },
          },
          required: ["observations"],
        },
      },
      {
        name: "delete_entities",
        description: "删除一个或多个实体及其相关的关系。删除实体会同时删除该实体参与的所有关系，以及实体的所有观察项。这是一个不可逆操作，请谨慎使用。",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: { 
              type: "array", 
              items: { type: "string" },
              description: "要删除的实体名称数组，指定哪些实体将被移除" 
            },
          },
          required: ["entityNames"],
        },
      },
      {
        name: "delete_observations",
        description: "删除实体的特定观察项。可以通过索引精确定位要删除的观察。这允许对实体进行细粒度的信息管理，纠正或移除不再相关的观察。",
        inputSchema: {
          type: "object",
          properties: {
            deletions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "实体名称，指定包含待删除观察的实体" },
                  index: { type: "number", description: "要删除的观察索引，从0开始计数" },
                },
                required: ["entityName", "index"],
              },
            },
          },
          required: ["deletions"],
        },
      },
      {
        name: "delete_relations",
        description: "删除知识图谱中的特定关系。可以通过指定源实体、目标实体和关系类型来精确删除特定关系。这不会影响相关实体本身，只移除它们之间的连接。",
        inputSchema: {
          type: "object",
          properties: {
            relations: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  source: { type: "string", description: "源实体名称，关系的起点" },
                  target: { type: "string", description: "目标实体名称，关系的终点" },
                  type: { type: "string", description: "关系类型，如'认识'、'拥有'等" },
                },
                required: ["source", "target", "type"],
              },
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "search_nodes",
        description: "根据查询条件搜索实体。这个工具会在实体名称、类型、属性和观察内容中查找匹配查询的实体，并返回相关实体及其之间的关系。适用于需要查找特定信息但不确定精确实体名称的场景。",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "搜索关键词，将在实体名称、类型、属性和观察中查找匹配项" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_specific_nodes",
        description: "按名称检索特定节点。当你知道确切的实体名称，想要获取这些实体的详细信息及其相互关系时使用。可以同时查询多个实体，系统会返回这些实体的完整信息和它们之间的关系。",
        inputSchema: {
          type: "object",
          properties: {
            names: { 
              type: "array", 
              items: { type: "string" },
              description: "要查找的实体名称数组，精确匹配这些名称的实体将被返回" 
            },
          },
          required: ["names"],
        },
      },
      {
        name: "load_graph",
        description: "加载指定的知识图谱文件。系统支持管理多个知识图谱文件，此工具可以切换到特定的知识图谱文件。可以提供文件名（在默认目录中查找）或完整路径。切换知识图谱后，所有操作将基于新加载的图谱。",
        inputSchema: {
          type: "object",
          properties: {
            fileName: { type: "string", description: "知识图谱文件名或路径。如果只提供文件名，将在默认目录中查找；如果提供完整路径，将直接使用该路径" },
          },
          required: ["fileName"],
        },
      },
      {
        name: "get_graph_files",
        description: "获取可用的知识图谱文件列表。返回系统中所有可用的知识图谱文件，包括当前正在使用的文件和存储这些文件的目录路径。可以帮助了解有哪些知识图谱可供切换使用。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_observation",
        description: "更新实体的特定观察项。通过索引精确定位要更新的观察，可以修改观察的内容、时间戳和来源。这允许修正或更新现有观察中的信息，而不必删除后重新添加。",
        inputSchema: {
          type: "object",
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "实体名称，指定包含待更新观察的实体" },
                  index: { type: "number", description: "要更新的观察项索引，从0开始计数" },
                  content: { type: "string", description: "新的观察内容，将替换原有内容" },
                  timestamp: { type: "string", description: "新的时间戳，默认为当前时间" },
                  source: { type: "string", description: "新的数据来源，默认为原始来源或'user'" },
                },
                required: ["entityName", "index", "content"],
              },
            },
          },
          required: ["updates"],
        },
      },
      {
        name: "update_entity_observations",
        description: "一次性替换实体的所有观察项。这个工具允许完全重写实体的整个观察列表，用新的观察集合替换现有的所有观察。适用于需要大规模更新实体信息的场景。",
        inputSchema: {
          type: "object",
          properties: {
            entityName: { type: "string", description: "实体名称，指定要更新观察的实体" },
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string", description: "观察内容，每项应为实体的单一事实信息" },
                  timestamp: { type: "string", description: "时间戳，记录观察添加的时间" },
                  source: { type: "string", description: "数据来源，记录观察的来源" },
                },
                required: ["content"],
              },
            },
          },
          required: ["entityName", "observations"],
        },
      },
      {
        name: "create_graph",
        description: "创建一个新的知识图谱文件。这个工具可以初始化一个全新的、空白的知识图谱文件，并立即切换到该文件。新文件将在默认目录下创建，可以指定文件名（会自动添加.json扩展名）。",
        inputSchema: {
          type: "object",
          properties: {
            fileName: { type: "string", description: "新的知识图谱文件名，不能包含路径分隔符或'..'，系统会自动添加.json扩展名" },
          },
          required: ["fileName"],
        },
      },
      {
        name: "delete_graph",
        description: "删除指定的知识图谱文件。这是一个不可逆的操作，会永久删除指定的知识图谱文件及其中的所有数据。删除当前正在使用的文件后，系统会自动切换到默认知识图谱文件。",
        inputSchema: {
          type: "object",
          properties: {
            fileName: { type: "string", description: "要删除的知识图谱文件名，通常需要包含.json扩展名" },
          },
          required: ["fileName"],
        },
      },
      {
        name: "update_entity",
        description: "更新实体的基本信息，包括更新实体类型和/或重命名实体。可以只更新类型而不重命名，也可以同时更新类型并重命名实体。",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "新实体名称（必需，即使不重命名也要提供）" },
            type: { type: "string", description: "新实体类型（必需，即使不改变类型也要提供）" },
            oldName: { type: "string", description: "原实体名称（可选，仅在需要重命名时提供）" }
          },
          required: ["name", "type"],
        },
      },
      {
        name: "update_entity_properties",
        description: "完全替换指定实体的properties对象。如果只想添加或修改部分属性，需要先获取现有属性，合并后再调用此API。",
        inputSchema: {
          type: "object",
          properties: {
            entityName: { type: "string", description: "要更新属性的实体名称" },
            properties: { type: "object", description: "新的完整属性对象，旧的properties对象将被完全覆盖" }
          },
          required: ["entityName", "properties"],
        },
      },
      {
        name: "update_relation_type",
        description: "更改现有关系的类型。此操作会保留关系的原有属性。内部实现是通过删除原关系并创建具有新类型和相同属性的新关系来完成的。",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "源实体名称" },
            target: { type: "string", description: "目标实体名称" },
            type: { type: "string", description: "新关系类型" },
            originalType: { type: "string", description: "原关系类型，用于定位要修改的关系" }
          },
          required: ["source", "target", "type", "originalType"],
        },
      },
      {
        name: "update_relation_properties",
        description: "完全替换特定关系的properties对象。将覆盖该关系现有的所有属性。",
        inputSchema: {
          type: "object",
          properties: {
            relation: {
              type: "object",
              properties: {
                source: { type: "string", description: "源实体名称" },
                target: { type: "string", description: "目标实体名称" },
                type: { type: "string", description: "关系类型" },
                properties: { type: "object", description: "新的完整属性对象" }
              },
              required: ["source", "target", "type", "properties"],
            }
          },
          required: ["relation"],
        },
      },
      {
        name: "get_relation_properties",
        description: "获取由源实体、目标实体和关系类型唯一确定的单个关系的属性。",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "源实体名称" },
            target: { type: "string", description: "目标实体名称" },
            type: { type: "string", description: "关系类型" }
          },
          required: ["source", "target", "type"],
        },
      },
    ],
  };
});

// 用于处理HTTP请求的辅助函数
async function makeRequest(method: string, endpoint: string, data?: any) {
  const url = `${KG_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    throw error;
  }
}

// 定义请求参数类型接口
interface RequestParams {
  name: string;
  arguments?: Record<string, any>;
}

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as RequestParams;

  try {
    let result;

    switch (name) {
      case "get_complete_graph":
        result = await makeRequest("GET", "/graph");
        break;
      case "create_entities":
        result = await makeRequest("POST", "/entities", { entities: args?.entities });
        break;
      case "create_relations":
        result = await makeRequest("POST", "/relations", { relations: args?.relations });
        break;
      case "add_observations":
        result = await makeRequest("POST", "/observations", { observations: args?.observations });
        break;
      case "delete_entities":
        result = await makeRequest("DELETE", "/entities", { entityNames: args?.entityNames });
        break;
      case "delete_observations":
        result = await makeRequest("DELETE", "/observations", { deletions: args?.deletions });
        break;
      case "delete_relations":
        result = await makeRequest("DELETE", "/relations", { relations: args?.relations });
        break;
      case "search_nodes":
        result = await makeRequest("GET", `/search?query=${encodeURIComponent(args?.query as string)}`);
        break;
      case "get_specific_nodes":
        const names = args?.names as string[] || [];
        const namesParam = names.join(',');
        result = await makeRequest("GET", `/nodes?names=${encodeURIComponent(namesParam)}`);
        break;
      case "load_graph":
        result = await makeRequest("POST", "/load-graph", { fileName: args?.fileName });
        break;
      case "get_graph_files":
        result = await makeRequest("GET", "/graph-files");
        break;
      case "update_observation":
        result = await makeRequest("PUT", "/observations", { updates: args?.updates });
        break;
      case "update_entity_observations":
        result = await makeRequest("PUT", "/entity-observations", { 
          entityName: args?.entityName, 
          observations: args?.observations 
        });
        break;
      case "create_graph":
        result = await makeRequest("POST", "/create-graph", { fileName: args?.fileName });
        break;
      case "delete_graph":
        result = await makeRequest("DELETE", "/delete-graph", { fileName: args?.fileName });
        break;
      case "update_entity":
        result = await makeRequest("PUT", "/entity", { 
          name: args?.name, 
          type: args?.type, 
          oldName: args?.oldName 
        });
        break;
      case "update_entity_properties":
        result = await makeRequest("PUT", "/entity-properties", { 
          entityName: args?.entityName, 
          properties: args?.properties 
        });
        break;
      case "update_relation_type":
        result = await makeRequest("PUT", "/relation", { 
          source: args?.source, 
          target: args?.target, 
          type: args?.type, 
          originalType: args?.originalType 
        });
        break;
      case "update_relation_properties":
        result = await makeRequest("PUT", "/relation-properties", { 
          relation: args?.relation 
        });
        break;
      case "get_relation_properties":
        result = await makeRequest("GET", `/relations/${encodeURIComponent(args?.source as string)}/${encodeURIComponent(args?.target as string)}/${encodeURIComponent(args?.type as string)}/properties`);
        break;
      default:
        throw new Error(`未知工具: ${name}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { 
      content: [{ 
        type: "text", 
        text: `执行 ${name} 时出错: ${error instanceof Error ? error.message : String(error)}` 
      }] 
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("知识图谱 MCP 服务器运行中");
}

main().catch((error) => {
  console.error("主函数出现致命错误:", error);
  process.exit(1);
});