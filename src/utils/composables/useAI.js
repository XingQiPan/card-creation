import { ref } from 'vue'

export function useAI() {
  const isProcessing = ref(false)
  
  // 模拟 AI 请求延迟
  const simulateAIRequest = async (result, delay = 1500) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(result)
      }, delay)
    })
  }
  
  // 续写功能
  const generateContinuation = async (options) => {
    isProcessing.value = true
    try {
      // 这里是模拟 AI 续写，实际项目中应该调用 AI API
      const { context, length, style } = options
      
      let result = ''
      
      // 根据不同长度生成不同内容
      if (length === 'short') {
        result = await simulateAIRequest(
          `${context.slice(-30)}...接着，主角发现了一个隐藏的线索，这让整个事件有了新的转机。他决定深入调查，即使这意味着要面对更大的风险。`
        )
      } else if (length === 'medium') {
        result = await simulateAIRequest(
          `${context.slice(-30)}...接着，主角发现了一个隐藏的线索，这让整个事件有了新的转机。他决定深入调查，即使这意味着要面对更大的风险。\n\n当夜幕降临，他悄悄潜入了那座废弃的建筑。空气中弥漫着灰尘和历史的气息，每一步都伴随着木板的吱呀声。突然，一道微弱的光线从走廊尽头闪过。他屏住呼吸，慢慢靠近，心跳声在寂静中格外清晰。`
        )
      } else {
        result = await simulateAIRequest(
          `${context.slice(-30)}...接着，主角发现了一个隐藏的线索，这让整个事件有了新的转机。他决定深入调查，即使这意味着要面对更大的风险。\n\n当夜幕降临，他悄悄潜入了那座废弃的建筑。空气中弥漫着灰尘和历史的气息，每一步都伴随着木板的吱呀声。突然，一道微弱的光线从走廊尽头闪过。他屏住呼吸，慢慢靠近，心跳声在寂静中格外清晰。\n\n"谁在那里？"一个沙哑的声音打破了沉默。他迅速躲到一根柱子后面，观察着声音的来源。一个佝偻的身影手持油灯，缓慢地在走廊中移动。这是他从未预料到的遭遇，但也可能是找到真相的关键。他深吸一口气，做出了一个可能改变一切的决定。\n\n"是我，"他走出阴影，直面未知，"我来寻找真相。"`
        )
      }
      
      // 如果有风格要求，添加风格描述
      if (style) {
        result += `\n\n[AI 已根据您的要求，以"${style}"的风格续写]`
      }
      
      return result.trim()
    } finally {
      isProcessing.value = false
    }
  }
  
  // 扩写功能
  const expandContent = async (options) => {
    isProcessing.value = true
    try {
      const { text, factor, focus } = options
      
      // 模拟不同类型的扩写
      let result = ''
      
      if (focus === 'description') {
        result = await simulateAIRequest(
          `这座古老的城堡矗立在悬崖边，风化的石墙上爬满了常春藤，每一块石头似乎都在诉说着几个世纪的故事。高耸的塔楼直插云霄，尖顶上的风向标在呼啸的海风中摇摆。城堡的窗户像是无数双眼睛，俯瞰着下方汹涌的海浪。当阳光透过厚重的云层时，整个建筑物仿佛被镀上了一层金色的光芒，显得神秘而庄严。`
        )
      } else if (focus === 'emotion') {
        result = await simulateAIRequest(
          `他的心像是被一只无形的手紧紧攥住，每一次呼吸都变得困难而痛苦。眼泪在眼眶中打转，却倔强地不肯落下。他的嘴唇微微颤抖，手指无意识地绞在一起，指节因用力而发白。那种无助感如潮水般涌来，淹没了他所有的理智和勇气。他转过身，不想让任何人看到他脆弱的一面，但那种深入骨髓的悲伤却无处可藏，仿佛整个世界都在他的肩膀上崩塌。`
        )
      } else if (focus === 'action') {
        result = await simulateAIRequest(
          `他迅速从掩体后跃出，身体在空中划出一道优美的弧线，同时右手已经握紧了腰间的武器。落地的瞬间，他顺势一个翻滚，避开了迎面而来的攻击。借着惯性，他猛地站起，左脚蹬地，整个人如离弦之箭般冲向对手。在接近的刹那，他突然改变方向，一个侧身闪到敌人身后，手中的武器划出一道寒光。整个动作一气呵成，没有丝毫犹豫，展现出多年训练的成果。`
        )
      } else if (focus === 'dialogue') {
        result = await simulateAIRequest(
          `"你真的认为这是最好的选择吗？"她轻声问道，眼神中带着难以掩饰的担忧。\n\n他停下手中的动作，深吸一口气，"我不知道是不是最好的，但这是唯一的选择。"\n\n"总是有其他方法的，"她走近一步，声音带着恳求，"我们可以一起想办法，不必冒这么大的风险。"\n\n他苦笑着摇摇头，"时间不等人，每一分每一秒都有人因此而受苦。如果我有能力改变，却选择袖手旁观，那我将无法原谅自己。"\n\n"那我呢？"她的声音突然提高，眼中闪烁着泪光，"如果你出了什么事，让我怎么办？"\n\n沉默在两人之间蔓延，最终他轻轻握住她的手，"相信我，我会回来的。这不仅是为了别人，也是为了我们的未来。"`
        )
      }
      
      return result
    } finally {
      isProcessing.value = false
    }
  }
  
  // 获取灵感
  const getInspirationIdeas = async (options) => {
    isProcessing.value = true
    try {
      const { context, type } = options
      
      // 模拟不同类型的灵感
      let result = ''
      
      if (type === 'plot') {
        result = await simulateAIRequest(
          `故事转折建议：主角发现自己一直信任的导师实际上是整个阴谋的幕后黑手，所有的指导都是为了引导主角走向一个精心设计的陷阱。这个发现不仅动摇了主角的信念，也迫使他重新审视过去所有的决定和行动。`
        )
      } else if (type === 'character') {
        result = await simulateAIRequest(
          `角色发展建议：让角色面对一个与自己核心价值观相冲突的艰难选择，通过这个选择展现角色的内心挣扎和成长。这个选择可以是在个人利益和集体利益之间、在爱情和责任之间，或者在理想和现实之间的抉择。`
        )
      } else if (type === 'setting') {
        result = await simulateAIRequest(
          `场景描写建议：描绘一个随季节变化而呈现不同面貌的地点，可以是一座古老的花园、一片神秘的森林或一个依山傍水的小镇。通过不同季节的描写，展现环境的多样性和故事的时间流动，同时也可以与角色的情感变化形成呼应。`
        )
      } else if (type === 'conflict') {
        result = await simulateAIRequest(
          `冲突设计建议：创造一个道德困境，其中没有明确的对错，每个选择都有其合理性和代价。让不同立场的角色各自为自己的观点辩护，通过他们的冲突展现问题的复杂性和人性的多面性。`
        )
      }
      
      return result
    } finally {
      isProcessing.value = false
    }
  }
  
  // 一键排版
  const formatContent = async (options) => {
    isProcessing.value = true
    try {
      const { text, style } = options
      
      // 简单的排版处理
      let formattedText = text
      
      // 删除多余空行
      formattedText = formattedText.replace(/\n{3,}/g, '\n\n')
      
      // 确保段落之间有空行
      formattedText = formattedText.replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      
      // 修正标点符号
      formattedText = formattedText.replace(/([，。！？；：、])\s*/g, '$1')
      
      // 根据不同风格进行额外处理
      if (style === 'web') {
        // 网文风格：段落短，对话多
        formattedText = formattedText.replace(/([。！？])/g, '$1\n\n')
      } else if (style === 'script') {
        // 剧本格式：对话前加角色名
        formattedText = formattedText.replace(/"([^"]+)"/g, '角色："$1"')
      }
      
      return await simulateAIRequest(formattedText)
    } finally {
      isProcessing.value = false
    }
  }
  
  return {
    isProcessing,
    generateContinuation,
    expandContent,
    getInspirationIdeas,
    formatContent
  }
} 