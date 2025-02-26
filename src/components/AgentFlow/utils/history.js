export class HistoryManager {
  constructor(initialState) {
    this.history = [JSON.stringify(initialState)];
    this.currentIndex = 0;
    this.maxHistory = 50; // 最大历史记录数
  }

  // 添加新状态
  push(state) {
    // 如果当前不在最新状态，删除当前位置之后的所有状态
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新状态
    this.history.push(JSON.stringify(state));
    
    // 如果历史记录超过最大数量，删除最早的记录
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  // 撤销
  undo() {
    if (this.canUndo()) {
      this.currentIndex--;
      return JSON.parse(this.history[this.currentIndex]);
    }
    return null;
  }

  // 重做
  redo() {
    if (this.canRedo()) {
      this.currentIndex++;
      return JSON.parse(this.history[this.currentIndex]);
    }
    return null;
  }

  // 检查是否可以撤销
  canUndo() {
    return this.currentIndex > 0;
  }

  // 检查是否可以重做
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  // 获取当前状态
  getCurrentState() {
    return JSON.parse(this.history[this.currentIndex]);
  }
} 