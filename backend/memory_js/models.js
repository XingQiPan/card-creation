// models.js
// 知识图谱系统的数据模型定义

class Entity {
  /**
   * 初始化实体对象
   * 
   * @param {string} name - 实体的唯一标识符
   * @param {string} entityType - 实体类型，如'person'、'organization'等
   * @param {Array} observations - 关于该实体的观察项列表，默认为空数组
   */
  constructor(name, entityType, observations = []) {
    this.name = name;
    this.entityType = entityType;
    this.observations = observations;
  }

  /**
   * 添加单个观察项
   * @param {string} observation - 观察项内容
   * @returns {boolean} - 是否成功添加
   */
  addObservation(observation) {
    if (!this.observations.includes(observation)) {
      this.observations.push(observation);
      return true;
    }
    return false;
  }

  /**
   * 批量添加多个观察项
   * @param {Array} observations - 观察项列表
   * @returns {Array} - 成功添加的观察项列表
   */
  addObservations(observations) {
    const added = [];
    for (const obs of observations) {
      if (!this.observations.includes(obs)) {
        this.observations.push(obs);
        added.push(obs);
      }
    }
    return added;
  }

  /**
   * 删除特定观察项
   * @param {string} observation - 要删除的观察项
   * @returns {boolean} - 是否成功删除
   */
  removeObservation(observation) {
    const index = this.observations.indexOf(observation);
    if (index !== -1) {
      this.observations.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 将实体转换为字典表示
   * @returns {Object} - 实体的字典表示
   */
  toDict() {
    return {
      name: this.name,
      entityType: this.entityType,
      observations: this.observations
    };
  }

  /**
   * 从字典创建实体对象
   * @param {Object} data - 实体数据字典
   * @returns {Entity} - 新的实体对象
   */
  static fromDict(data) {
    return new Entity(
      data.name,
      data.entityType,
      data.observations || []
    );
  }
}

class Relation {
  /**
   * 初始化关系对象
   * 
   * @param {string} fromEntity - 源实体名称
   * @param {string} toEntity - 目标实体名称
   * @param {string} relationType - 关系类型，描述实体间的交互方式
   */
  constructor(fromEntity, toEntity, relationType) {
    this.fromEntity = fromEntity;
    this.toEntity = toEntity;
    this.relationType = relationType;
  }

  /**
   * 将关系转换为字典表示
   * @returns {Object} - 关系的字典表示
   */
  toDict() {
    return {
      from: this.fromEntity,
      to: this.toEntity,
      relationType: this.relationType
    };
  }

  /**
   * 从字典创建关系对象
   * @param {Object} data - 关系数据字典
   * @returns {Relation} - 新的关系对象
   */
  static fromDict(data) {
    return new Relation(
      data.from,
      data.to,
      data.relationType
    );
  }

  /**
   * 判断两个关系是否相等
   * @param {Relation} other - 要比较的另一个关系对象
   * @returns {boolean} - 是否相等
   */
  equals(other) {
    if (!(other instanceof Relation)) {
      return false;
    }
    return (
      this.fromEntity === other.fromEntity &&
      this.toEntity === other.toEntity &&
      this.relationType === other.relationType
    );
  }

  /**
   * 生成关系的哈希值，用于集合操作
   * @returns {string} - 哈希字符串
   */
  hash() {
    return `${this.fromEntity}|${this.toEntity}|${this.relationType}`;
  }
}

export { Entity, Relation }; 