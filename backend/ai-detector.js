import { PythonShell } from 'python-shell';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIDetector {
  constructor() {
    this.pythonOptions = {
      mode: 'text',
      pythonPath: 'python',
      scriptPath: __dirname,
      encoding: 'utf8',
      pythonOptions: ['-u'],
    };
  }

  async analyze(text) {
    return new Promise((resolve, reject) => {
      if (!text || typeof text !== 'string') {
        reject(new Error('无效的输入文本'));
        return;
      }

      console.log('开始分析文本...');
      let pyshell = new PythonShell('detector.py', this.pythonOptions);
      let result = '';
      let hasEnded = false;

      pyshell.on('message', (message) => {
        console.log('收到Python输出:', message);
        result = message;
      });

      pyshell.on('stderr', (stderr) => {
        console.error('Python stderr:', stderr);
      });

      pyshell.on('error', (err) => {
        if (hasEnded) return;
        hasEnded = true;
        console.error('Python error:', err);
        pyshell.terminate();
        reject(err);
      });

      console.log('发送文本到Python...');
      pyshell.send(text);
      pyshell.end((err) => {
        if (err) {
          console.error('Python end error:', err);
        }
      });

      pyshell.on('close', (code) => {
        if (hasEnded) return;
        hasEnded = true;
        console.log('Python进程结束，退出码:', code);

        try {
          if (!result) {
            reject(new Error('没有收到分析结果'));
            return;
          }

          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Raw result:', result);
          reject(new Error('结果解析失败'));
        } finally {
          pyshell.terminate();
        }
      });

      setTimeout(() => {
        if (hasEnded) return;
        hasEnded = true;
        console.error('Python进程超时');
        pyshell.terminate();
        reject(new Error('模型加载超时，请重试'));
      }, 100000);
    });
  }
}

export { AIDetector };