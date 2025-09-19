# 精细化编辑系统使用指南

## 概述

本编辑系统为您的React应用提供了完整的可视化编辑功能，支持对所有元素进行精细化编辑，包括拖拽、调整大小、文本编辑、图片替换等功能，并提供边框吸附、网格对齐等辅助功能。

## 核心功能

### ✨ 主要特性

- **[object Object] 支持文本、图片、按钮等所有元素类型的编辑
- **📐 边框吸附**: 元素间自动对齐和网格吸附功能
-[object Object]寸调整**: 拖拽调整元素宽高，支持最小尺寸限制
- **[object Object] 复制、删除、层级调整等常用操作
- **🎛️ 多选操作**: 支持选择框多选和批量操作
- **↩️ 撤销重做**: 完整的历史记录管理
- **💾 数据持久化**: 自动保存到localStorage

### 🎨 视觉反馈

- 编辑模式下显示网格背景
- 元素选中时显示调整控制点
- 悬停时显示边框高亮
- 实时显示吸附线和对齐参考

## 快速开始

### 1. 基础集成

```tsx
import { EditableContainer } from './components/EditableContainer';

function App() {
  return (
    <EditableContainer>
      {/* 您的应用内容 */}
    </EditableContainer>
  );
}
```

### 2. 使用可编辑元素

```tsx
import Editable from './components/Editable';
import EditableText from './components/EditableText';
import EditableImage from './components/EditableImage';

function MyComponent() {
  return (
    <div>
      {/* 基础可编辑容器 */}
      <Editable 
        id="my-element"
        defaultPosition={{ x: 0, y: 0 }}
        defaultSize={{ width: 300, height: 200 }}
        enableResize={true}
      >
        <div className="p-4 bg-white rounded-lg">
          我是可编辑的内容
        </div>
      </Editable>

      {/* 可编辑文本 */}
      <EditableText
        id="my-title"
        tag="h1"
        className="text-2xl font-bold"
        defaultText="点击编辑标题"
      >
        点击编辑标题
      </EditableText>

      {/* 可编辑图片 */}
      <EditableImage
        id="my-image"
        src="/path/to/image.jpg"
        alt="描述"
        className="w-full h-48 object-cover"
      />
    </div>
  );
}
```

## 组件API

### Editable 组件

主要的可编辑容器组件，为子元素提供拖拽、调整大小等功能。

```tsx
interface EditableProps {
  id: string;                    // 唯一标识符
  children: React.ReactNode;     // 子元素
  defaultPosition?: { x: number; y: number };  // 默认位置
  defaultSize?: { width: number; height: number }; // 默认尺寸
  enableResize?: boolean;        // 是否启用调整大小 (默认: true)
  enableTextEdit?: boolean;      // 是否启用文本编辑 (默认: true)
  className?: string;            // CSS类名
  style?: React.CSSProperties;   // 内联样式
  snapToGrid?: boolean;          // 是否启用网格吸附 (默认: true)
  gridSize?: number;             // 网格大小 (默认: 10)
}
```

### EditableText 组件

专门用于文本编辑的组件，支持内联编辑。

```tsx
interface EditableTextProps {
  id: string;                    // 唯一标识符
  children: React.ReactNode;     // 显示的文本内容
  defaultText?: string;          // 默认文本
  tag?: keyof JSX.IntrinsicElements; // HTML标签 (默认: 'div')
  className?: string;            // CSS类名
  style?: React.CSSProperties;   // 内联样式
  onTextChange?: (text: string) => void; // 文本变化回调
}
```

### EditableImage 组件

专门用于图片编辑的组件，支持图片替换。

```tsx
interface EditableImageProps {
  id: string;                    // 唯一标识符
  src: string;                   // 图片源
  alt?: string;                  // 图片描述
  className?: string;            // CSS类名
  style?: React.CSSProperties;   // 内联样式
  onImageChange?: (src: string) => void; // 图片变化回调
}
```

## 使用示例

### 示例1: 基础页面编辑

```tsx
import Editable from './components/Editable';
import EditableText from './components/EditableText';

function HomePage() {
  return (
    <div>
      {/* 标题区域 */}
      <Editable id="hero-section" defaultPosition={{ x: 0, y: 0 }}>
        <section className="py-20 text-center">
          <EditableText
            id="main-title"
            tag="h1"
            className="text-4xl font-bold mb-4"
            defaultText="欢迎来到我们的网站"
          >
            欢迎来到我们的网站
          </EditableText>
          <EditableText
            id="subtitle"
            tag="p"
            className="text-lg text-gray-600"
            defaultText="这里是副标题，双击可以编辑"
          >
            这里是副标题，双击可以编辑
          </EditableText>
        </section>
      </Editable>

      {/* 功能卡片 */}
      <Editable 
        id="feature-card"
        defaultPosition={{ x: 100, y: 300 }}
        defaultSize={{ width: 300, height: 200 }}
        enableResize={true}
      >
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <EditableText
            id="card-title"
            tag="h3"
            className="text-xl font-semibold mb-2"
            defaultText="功能标题"
          >
            功能标题
          </EditableText>
          <EditableText
            id="card-description"
            tag="p"
            className="text-gray-600"
            defaultText="功能描述内容..."
          >
            功能描述内容...
          </EditableText>
        </div>
      </Editable>
    </div>
  );
}
```

### 示例2: 现有页面改造

如果您已经有现有页面，可以通过包装现有元素来添加编辑功能：

```tsx
// 原始代码
function OriginalComponent() {
  return (
    <div className="hero-section">
      <h1>原始标题</h1>
      <p>原始描述</p>
      <img src="/image.jpg" alt="图片" />
    </div>
  );
}

// 改造后的代码
function EditableComponent() {
  return (
    <Editable id="hero-wrapper" defaultPosition={{ x: 0, y: 0 }}>
      <div className="hero-section">
        <EditableText
          id="hero-title"
          tag="h1"
          defaultText="原始标题"
        >
          原始标题
        </EditableText>
        <EditableText
          id="hero-description"
          tag="p"
          defaultText="原始描述"
        >
          原始描述
        </EditableText>
        <EditableImage
          id="hero-image"
          src="/image.jpg"
          alt="图片"
        />
      </div>
    </Editable>
  );
}
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+A` | 全选所有元素 |
| `Ctrl+C` | 复制选中元素 |
| `Delete` / `Backspace` | 删除选中元素 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Escape` | 取消选择 |
| `双击` | 编辑文本 |

## 工具栏功能

### 主工具栏 (顶部中央)
- **全选/取消选择**: 批量选择元素
- **复制/删除**: 批量操作选中元素
- **对齐工具**: 左对齐、居中对齐、水平分布
- **保存**: 保存当前布局到本地存储

### 元素工具栏 (选中元素时显示)
- **复制**: 复制当前元素
- **层级**: 置于顶层/底层
- **锁定**: 锁定元素位置
- **删除**: 删除当前元素

### 撤销重做 (右下角)
- **撤销**: 撤销上一步操作
- **重做**: 重做已撤销的操作
- **历史记录**: 显示当前历史位置

## 数据持久化

编辑系统会自动将以下数据保存到localStorage：

- `wz_element_positions`: 元素位置和尺寸信息
- `wz_element_texts`: 编辑后的文本内容
- `wz_element_images`: 替换后的图片源
- `wz_deleted_elements`: 已删除的元素列表
- `wz_edit_mode`: 编辑模式状态

## 最佳实践

### 1. ID命名规范
```tsx
// 推荐的ID命名方式
<Editable id="page-home-hero-section">
<EditableText id="page-home-hero-title">
<EditableImage id="page-home-hero-image">
```

### 2. 响应式设计
```tsx
// 考虑不同屏幕尺寸的默认位置
<Editable 
  id="responsive-element"
  defaultPosition={{ 
    x: window.innerWidth > 768 ? 100 : 20, 
    y: 50 
  }}
>
```

### 3. 性能优化
```tsx
// 对于复杂内容，使用React.memo优化
const ExpensiveComponent = React.memo(({ children }) => (
  <Editable id="expensive-component">
    {children}
  </Editable>
));
```

### 4. 条件编辑
```tsx
// 根据用户权限控制编辑功能
<Editable 
  id="admin-only"
  enableResize={user.isAdmin}
  enableTextEdit={user.canEdit}
>
```

## 故障排除

### 常见问题

**Q: 元素无法拖拽？**
A: 检查是否已开启编辑模式，确保元素有正确的`data-editable-id`属性。

**Q: 文本编辑不生效？**
A: 确保`EditableText`组件有唯一的`id`，并且`enableTextEdit`为true。

**Q: 位置信息丢失？**
A: 检查localStorage是否可用，确保调用了`SAVE_POSITIONS` action。

**Q: 性能问题？**
A: 减少同时可编辑的元素数量，使用React.memo优化重渲染。

## 访问演示

访问 `/editing-example` 路由查看完整的功能演示和使用示例。

## 技术支持

如有问题或建议，请联系开发团队或查看项目文档。
