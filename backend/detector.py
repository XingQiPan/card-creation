from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import sys
import json
import codecs
import os

# 全局模型实例
MODEL = None

def get_model():
    global MODEL
    if MODEL is None:
        os.environ['TRANSFORMERS_CACHE'] = os.path.join(os.path.dirname(__file__), 'model_cache')
        # 使用 roberta-base-openai-detector 模型，这是一个专门用于检测AI生成文本的模型
        MODEL = pipeline("text-classification", 
                       model="roberta-base-openai-detector",
                       device=-1)  # 使用CPU
    return MODEL

def split_text(text):
    """将文本按句子分割"""
    # 简单的按句号、问号、感叹号分割
    sentences = []
    for line in text.split('\n'):
        for sent in line.replace('！', '!').replace('？', '?').replace('。', '.').split('.'):
            sent = sent.strip()
            if sent:  # 只添加非空句子
                sentences.append(sent + '.')
    return sentences

def analyze_text(text):
    if not text or not isinstance(text, str):
        return {
            "human": 100,
            "ai": 0,
            "uncertain": 0,
            "message": "无效的输入文本"
        }

    text = text.strip()
    
    if len(text) < 50:
        return {
            "human": 100,
            "ai": 0,
            "uncertain": 0,
            "message": "文本太短，无法进行有效分析"
        }

    try:
        print("开始加载模型...", file=sys.stderr)
        model = get_model()
        print("模型加载完成", file=sys.stderr)

        # 将文本分割成句子
        sentences = split_text(text)
        print(f"\n调试信息 - 文本被分割成 {len(sentences)} 个句子", file=sys.stderr)
        
        sentence_results = []
        for i, sentence in enumerate(sentences):
            if not sentence.strip():  # 跳过空句子
                continue
                
            result = model(sentence)[0]
            score = result['score']
            
            if result['label'] == 'Real':  # roberta-base-openai-detector 使用 'Real' 和 'Fake' 标签
                sent_human = round(score * 100)
                sent_ai = round((1 - score) * 100)
            else:
                sent_ai = round(score * 100)
                sent_human = round((1 - score) * 100)
            
            sentence_results.append({
                'sentence': i + 1,
                'human': sent_human,
                'ai': sent_ai
            })
            print(f"句子 {i+1}: 人类 {sent_human}%, AI {sent_ai}%", file=sys.stderr)

        # 计算平均值
        avg_human = round(sum(r['human'] for r in sentence_results) / len(sentence_results))
        avg_ai = round(sum(r['ai'] for r in sentence_results) / len(sentence_results))
        print(f"\n平均值: 人类 {avg_human}%, AI {avg_ai}%\n", file=sys.stderr)

        return {
            "human": avg_human,
            "ai": avg_ai,
            "uncertain": 0,
            "message": f"人类 {avg_human}%, AI {avg_ai}%"
        }

    except Exception as e:
        print(f"Error in analyze_text: {str(e)}", file=sys.stderr)
        return {
            "human": 0,
            "ai": 0,
            "uncertain": 100,
            "message": f"分析过程出错：{str(e)}"
        }

if __name__ == "__main__":
    try:
        sys.stdin = codecs.getreader('utf8')(sys.stdin.buffer)
        sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)
        
        input_text = sys.stdin.read().strip()
        
        if not input_text:
            print(json.dumps({
                "human": 0,
                "ai": 0,
                "uncertain": 100,
                "message": "未收到输入文本"
            }, ensure_ascii=False))
            sys.exit(1)
        
        result = analyze_text(input_text)
        print(json.dumps(result, ensure_ascii=False))
        sys.stdout.flush()
        
    except Exception as e:
        print(json.dumps({
            "human": 0,
            "ai": 0,
            "uncertain": 100,
            "message": f"处理失败：{str(e)}"
        }, ensure_ascii=False))
        sys.stdout.flush()