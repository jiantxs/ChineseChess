/**
 * @file 偏好渲染器 - 从 defaultUserPreference 动态推导 schema 渲染
 *
 * 用法：
 *   <PreferenceRenderer
 *     preference={preference}
 *     onChange={(updates) => handleChange(updates)}
 *     onHint={(hint) => handleHint(hint)}
 *   />
 */

import { useState } from 'react';
import type { UserPreference, PreferenceOption, PreferenceGroup, PreferenceHint, Platform } from '@chess/types';

// 从 dotted path 获取嵌套对象值
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// 判断对象是否是 PreferenceGroup（有 label 字段）
function isPreferenceGroup(obj: unknown): obj is PreferenceGroup {
  return !!(obj && typeof obj === 'object' && 'label' in obj && typeof (obj as Record<string, unknown>).label === 'string');
}

function isPreferenceOption(obj: unknown): obj is PreferenceOption<unknown> {
  return !!(obj && typeof obj === 'object' && 'value' in obj && 'visible' in obj);
}

// Schema 类型定义
type SchemaCategory = {
  key: string;
  label: string;
  groups: SchemaGroup[];
};

type SchemaGroup = {
  key: string;
  label: string;
  items: SchemaItem[];
};

type SchemaItem = {
  key: string;
  label: string;
  valueType: 'boolean' | 'number' | 'string';
  readonly?: boolean;
  range?: { min?: number; max?: number; step?: number };
  options?: string[];
  hint?: PreferenceHint;
};

// 从 preference 推导 schema（支持三层嵌套结构）
function deriveSchema(preference: UserPreference, currentPlatform: Platform): SchemaCategory[] {
  const categories: SchemaCategory[] = [];

  for (const [categoryKey, categoryValue] of Object.entries(preference)) {
    if (!categoryValue || typeof categoryValue !== 'object') continue;

    // 检查平台过滤：如果定义了 platforms，则当前平台必须在列表中
    if (isPreferenceGroup(categoryValue)) {
      const platforms = (categoryValue as PreferenceGroup).platforms;
      if (platforms && platforms.length > 0 && !platforms.includes(currentPlatform)) {
        continue; // 跳过不适用于当前平台的分类
      }
    }

    const categoryLabel = isPreferenceGroup(categoryValue) ? categoryValue.label : categoryKey;
    const groups: SchemaGroup[] = [];

    for (const [groupKey, groupValue] of Object.entries(categoryValue)) {
      if (!groupValue || typeof groupValue !== 'object') continue;
      if (groupKey === 'label') continue; // 跳过 label 字段

      if (isPreferenceOption(groupValue)) {
        // groupValue 直接是 PreferenceOption（没有中间层 like ai.difficulty）
        const opt = groupValue as PreferenceOption<unknown>;
        if (opt.visible) {
          groups.push({
            key: `${categoryKey}.${groupKey}`,
            label: opt.label ?? groupKey,
            items: [{
              key: `${categoryKey}.${groupKey}`,
              label: opt.label ?? groupKey,
              valueType: opt.valueType ?? (typeof opt.value === 'boolean' ? 'boolean' : typeof opt.value === 'number' ? 'number' : 'string'),
              readonly: opt.readonly,
              range: opt.range,
              options: opt.options,
              hint: opt.hint,
            }],
          });
        }
      } else {
        // groupValue 是容器（如 audio.bgm），继续遍历第三层
        const groupLabel = isPreferenceGroup(groupValue) ? groupValue.label : groupKey;
        const items: SchemaItem[] = [];
        
        for (const [itemKey, itemValue] of Object.entries(groupValue)) {
          if (itemKey === 'label') continue; // 跳过 label 字段
          if (!isPreferenceOption(itemValue)) continue;
          if (!itemValue.visible) continue;

          items.push({
            key: `${categoryKey}.${groupKey}.${itemKey}`,
            label: itemValue.label ?? itemKey,
            valueType: itemValue.valueType ?? (typeof itemValue.value === 'boolean' ? 'boolean' : typeof itemValue.value === 'number' ? 'number' : 'string'),
            readonly: itemValue.readonly,
            range: itemValue.range,
            options: itemValue.options,
            hint: itemValue.hint,
          });
        }

        if (items.length > 0) {
          groups.push({
            key: `${categoryKey}.${groupKey}`,
            label: groupLabel,
            items,
          });
        }
      }
    }

    if (groups.length > 0) {
      categories.push({ key: categoryKey, label: categoryLabel, groups });
    }
  }

  return categories;
}

// 检查是否应该触发提示
function shouldTriggerHint(hint: PreferenceHint, oldValue: unknown, newValue: unknown): boolean {
  switch (hint.trigger) {
    case 'onChange':
      return oldValue !== newValue;
    case 'onEnable':
      return oldValue === false && newValue === true;
    case 'onDisable':
      return oldValue === true && newValue === false;
    default:
      return false;
  }
}

interface PreferenceRendererProps {
  preference: UserPreference;
  currentPlatform: Platform;
  onChange: (updates: Partial<UserPreference>) => void;
  onHint?: (hint: PreferenceHint) => void;
}

function PreferenceControl({ item, value, onChange }: { item: SchemaItem; value: unknown; onChange: (path: string, value: unknown) => void }) {
  const { label, valueType, readonly, range } = item;

  if (readonly) {
    return (
      <div className="setting-item disabled">
        <div className="setting-info">
          <span className="setting-name">{label}</span>
        </div>
        <div className="setting-control">
          {valueType === 'boolean' && <span className="readonly-value">{value ? '是' : '否'}</span>}
          {valueType === 'number' && <span className="readonly-value">{String(value)}</span>}
          {valueType === 'string' && item.options && (
            <select disabled className="setting-select">
              <option value={String(value)}>{String(value)}</option>
            </select>
          )}
          {valueType === 'string' && !item.options && (
            <span className="readonly-value readonly-text" title={String(value)}>
              {String(value)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (valueType === 'boolean') {
    return (
      <div className="setting-item">
        <div className="setting-info">
          <span className="setting-name">{label}</span>
        </div>
        <div className="setting-control">
          <label className="toggle-switch">
            <input type="checkbox" checked={value as boolean} onChange={(e) => onChange(item.key, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span className="toggle-label">{value ? '开启' : '关闭'}</span>
        </div>
      </div>
    );
  }

  if (valueType === 'number' && range) {
    return (
      <div className="setting-item">
        <div className="setting-info">
          <span className="setting-name">{label}</span>
        </div>
        <div className="setting-control volume-control">
          <input
            type="range"
            min={range.min ?? 0}
            max={range.max ?? 100}
            step={range.step ?? 1}
            value={value as number}
            onChange={(e) => onChange(item.key, Number(e.target.value))}
            className="volume-slider"
          />
          <span className="volume-value">{String(value)}</span>
        </div>
      </div>
    );
  }

  if (valueType === 'string' && item.options) {
    return (
      <div className="setting-item">
        <div className="setting-info">
          <span className="setting-name">{label}</span>
        </div>
        <div className="setting-control">
          <select
            value={value as string}
            onChange={(e) => onChange(item.key, e.target.value)}
            className="setting-select"
          >
            {item.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return null;
}

export function PreferenceRenderer({ preference, currentPlatform, onChange, onHint }: PreferenceRendererProps) {
  const schema = deriveSchema(preference, currentPlatform);
  const [activeCategory, setActiveCategory] = useState<string>(schema[0]?.key ?? '');

  const handleItemChange = (path: string, newValue: unknown) => {
    const current = getByPath(preference, path);
    if (!isPreferenceOption(current)) return;
    
    // 检查是否需要触发提示
    if (current.hint && onHint) {
      if (shouldTriggerHint(current.hint, current.value, newValue)) {
        onHint(current.hint);
      }
    }
    
    // 只构造被修改的路径部分，避免携带未改动的 sibling 属性
    const keys = path.split('.');
    let partial: Record<string, unknown> = {};
    let cursor: Record<string, unknown> = partial;
    for (let i = 0; i < keys.length - 1; i++) {
      cursor[keys[i]] = {};
      cursor = cursor[keys[i]] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]] = { ...current, value: newValue };
    onChange(partial as Partial<UserPreference>);
  };

  const activeCategoryData = schema.find((c) => c.key === activeCategory);

  return (
    <div className="settings-layout">
      {/* 左侧分类导航 */}
      <div className="settings-sidebar">
        {schema.map((category) => (
          <button
            key={category.key}
            className={`category-btn ${activeCategory === category.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* 右侧内容区域 */}
      <div className="settings-content">
        {activeCategoryData && (
          <>
            {activeCategoryData.groups.map((group) => (
              <div key={group.key} className="settings-group">
                <h3 className="group-title">{group.label}</h3>
                {group.items.map((item) => {
                  const itemValue = getByPath(preference, item.key);
                  if (!isPreferenceOption(itemValue)) return null;
                  return (
                    <PreferenceControl
                      key={item.key}
                      item={item}
                      value={itemValue.value}
                      onChange={handleItemChange}
                    />
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
