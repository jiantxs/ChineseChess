/**
 * 用户偏好设置的类型定义。
 *
 * 此文件包含中国象棋应用偏好设置的所有类型：
 * - 平台类型定义
 * - 偏好分组描述
 * - 选项提示配置
 * - 用户偏好接口和默认值
 *
 * @module @chess/preference/types
 */

/**
 * 支持的平台类型，与 config 包中的 platform 定义保持一致
 */
export type Platform = 'web' | 'win' | 'android';

/**
 * 偏好设置分组描述 - 用于存放分类的显示名称
 */
export interface PreferenceGroup {
  /** 分组显示名称 */
  label: string;
  /** 该分类支持展示的平台，不填则所有平台都展示 */
  platforms?: Platform[];
}

/**
 * 提示消息中的超链接配置
 */
export interface PreferenceHintLink {
  /** 链接显示文字 */
  text: string;
  /** 链接路径（前端会使用 assetPath 转换） */
  path: string;
}

/**
 * 选项变更提示配置
 * 当选项值改变时显示提示信息
 */
export interface PreferenceHint {
  /** 提示消息内容 */
  message: string;
  /** 触发条件 */
  trigger: 'onChange' | 'onEnable' | 'onDisable';
  /** 提示类型 */
  type?: 'info' | 'warning' | 'success';
  /** 可选的超链接 */
  link?: PreferenceHintLink;
}

/**
 * 带可见性的偏好选项 - 包含渲染元数据
 */
export interface PreferenceOption<T> {
  /** 选项值 */
  value: T;
  /** 是否可见（用于条件显示配置项） */
  visible: boolean;
  /** 显示名称 */
  label?: string;
  /** 值类型 */
  valueType?: 'boolean' | 'number' | 'string';
  /** 是否只读 */
  readonly?: boolean;
  /** 范围/步进配置（number 类型时） */
  range?: { min?: number; max?: number; step?: number };
  /** 下拉选项（string 类型时） */
  options?: string[];
  /** 变更提示配置 */
  hint?: PreferenceHint;
}

/**
 * 用户偏好设置接口 - 分层结构
 * 这是前后端共享的偏好配置类型
 */
export interface UserPreference {
  /** 音频设置 */
  audio: PreferenceGroup & {
    /** 背景音乐设置 */
    bgm: PreferenceGroup & {
      /** 是否播放背景音乐 */
      enabled: PreferenceOption<boolean>;
      /** 背景音乐音量大小 (0-100) */
      volume: PreferenceOption<number>;
    };
  };
  /** AI 设置 */
  ai: PreferenceGroup & {
    /** AI 难度 (1-10)，影响搜索深度 */
    difficulty: PreferenceOption<number>;
  };

  extraSettings: PreferenceGroup & {
    extraServer: PreferenceGroup & {
      enabled: PreferenceOption<boolean>;
      /** 是否记住当前服务器地址编码，重启后保持地址不变 */
      rememberServerCode: PreferenceOption<boolean>;
      textCode: PreferenceOption<string>;
      /** 隐藏属性：存储额外服务器的端口，保证重启后地址编码不变 */
      _port: PreferenceOption<number>;
      /** 隐藏属性：存储额外服务器的 URL prefix，保证重启后地址编码不变 */
      _prefix: PreferenceOption<string>;
    }
  };
  /** 显示设置 */
  display: PreferenceGroup & {
    /** 窗口分辨率（包含无边框选项） */
    resolution: PreferenceOption<string>;
  };
}

/**
 * 默认用户偏好设置 - 包含渲染元数据
 */
export const defaultUserPreference: UserPreference = {
  audio: {
    label: '音量',
    bgm: {
      label: '背景音量',
      enabled: { value: true, visible: true, label: '背景音乐', valueType: 'boolean' },
      volume: { value: 100, visible: true, label: '音量', valueType: 'number', range: { min: 0, max: 100, step: 1 } },
    },
  },
  ai: {
    label: 'AI 设置',
    difficulty: { value: 5, visible: true, label: 'AI难度', valueType: 'number', range: { min: 1, max: 10, step: 1 } },
  },
  display: {
    label: '显示设置',
    platforms: ['win'],
    resolution: { value: '1600x900', visible: true, label: '窗口分辨率', valueType: 'string', options: ['1280x720', '1600x900', '1920x1080'] }
  },
  extraSettings: {
    label: '额外设置',
    platforms: ['win'],
    extraServer: {
      label: '额外服务器',
      enabled: { value: false, visible: true, label: '启用为安卓平台准备的额外服务器', valueType: 'boolean', hint: { message: '更改已保存，重启软件后生效', trigger: 'onEnable', type: 'warning', link: { text: '请点此获取安卓应用程序', path: '/assets/app.apk' } } },
      rememberServerCode: { value: true, visible: true, label: '记住当前服务器地址编码', valueType: 'boolean', hint: { message: '开启后重启软件将保持服务器地址编码不变，方便安卓端持续连接', trigger: 'onChange', type: 'info' } },
      textCode: { value: '', visible: true, label: '服务器地址编码', valueType: 'string', readonly: true },
      _port: { value: 0, visible: false, label: '', valueType: 'number' },
      _prefix: { value: '', visible: false, label: '', valueType: 'string' },
    }
  }
  };