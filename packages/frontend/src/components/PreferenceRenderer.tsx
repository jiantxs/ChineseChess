/**
 * @file 偏好渲染器 - 从 defaultUserPreference 动态推导 schema 渲染
 *
 * 用法：
 *   <PreferenceRenderer
 *     preference={preference}
 *     onChange={(updates) => handleChange(updates)}
 *   />
 */

import type { UserPreference, PreferenceOption } from '@chess/types';

// 从 dotted path 获取嵌套对象值
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// 从 dotted path 设置嵌套对象值（只改 value，不动元数据）
function setByPath(obj: unknown, path: string, value: unknown): unknown {
  const keys = path.split('.');
  const result = Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, unknown>) };
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// 从 defaultUserPreference 推导 schema（三层嵌套结构）
type SchemaSection = { section: string; title: string; items: SchemaItem[] };
type SchemaItem = {
  key: string;
  label: string;
  valueType: 'boolean' | 'number' | 'string';
  readonly?: boolean;
  range?: { min?: number; max?: number; step?: number };
  options?: string[];
};

function isPreferenceOption(obj: unknown): obj is PreferenceOption<unknown> {
  return !!(obj && typeof obj === 'object' && 'value' in obj && 'visible' in obj);
}

function deriveSchema(preference: UserPreference): SchemaSection[] {
  const sections: SchemaSection[] = [];

  // sectionKey = 'audio' | 'ai' | 'test'
  for (const [sectionKey, sectionValue] of Object.entries(preference)) {
    if (!sectionValue || typeof sectionValue !== 'object') continue;
    const sectionItems: SchemaItem[] = [];

    // groupKey = 'bgm' | 'difficulty'
    for (const [groupKey, groupValue] of Object.entries(sectionValue)) {
      if (!groupValue || typeof groupValue !== 'object') continue;

      if (isPreferenceOption(groupValue)) {
        // groupValue 直接是 PreferenceOption（没有中间层 like audio.bgm）
        const opt = groupValue as PreferenceOption<unknown>;
        if (opt.visible) {
          sectionItems.push({
            key: `${sectionKey}.${groupKey}`,
            label: opt.label ?? groupKey,
            valueType: opt.valueType ?? (typeof opt.value === 'boolean' ? 'boolean' : typeof opt.value === 'number' ? 'number' : 'string'),
            readonly: opt.readonly,
            range: opt.range,
            options: opt.options,
          });
        }
      } else {
        // groupValue 是容器（如 audio.bgm），继续遍历第三层
        for (const [itemKey, itemValue] of Object.entries(groupValue)) {
          if (!isPreferenceOption(itemValue)) continue;
          if (!itemValue.visible) continue;

          sectionItems.push({
            key: `${sectionKey}.${groupKey}.${itemKey}`,
            label: itemValue.label ?? itemKey,
            valueType: itemValue.valueType ?? (typeof itemValue.value === 'boolean' ? 'boolean' : typeof itemValue.value === 'number' ? 'number' : 'string'),
            readonly: itemValue.readonly,
            range: itemValue.range,
            options: itemValue.options,
          });
        }
      }
    }

    if (sectionItems.length > 0) {
      sections.push({ section: sectionKey, title: sectionKey, items: sectionItems });
    }
  }

  return sections;
}

function getSectionTitle(section: string): string {
  return section;
}

interface PreferenceRendererProps {
  preference: UserPreference;
  onChange: (updates: Partial<UserPreference>) => void;
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

export function PreferenceRenderer({ preference, onChange }: PreferenceRendererProps) {
  const schema = deriveSchema(preference);

  const handleItemChange = (path: string, newValue: unknown) => {
    const current = getByPath(preference, path);
    if (!isPreferenceOption(current)) return;
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

  return (
    <div className="settings-content">
      {schema.map((section) => (
        <div key={section.section} className="settings-section">
          <h2 className="section-title">{section.title}</h2>
          {section.items.map((item) => {
            const itemValue = getByPath(preference, item.key);
            if (!isPreferenceOption(itemValue)) return null;
            return (
              <PreferenceControl key={item.key} item={item} value={itemValue.value} onChange={handleItemChange} />
            );
          })}
        </div>
      ))}
    </div>
  );
}