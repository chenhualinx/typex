import { useEffect, useRef, useState, useCallback } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { SlashToolbar } from './SlashToolbar';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export function MarkdownEditor({ content, onChange, onSave }: MarkdownEditorProps) {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstanceRef = useRef<Vditor | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const slashRangeRef = useRef<Range | null>(null);

  const [showSlashToolbar, setShowSlashToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  // 获取光标位置
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { x: 0, y: 0 };

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    return {
      x: rect.left,
      y: rect.bottom + 8,
    };
  }, []);

  // 删除 '/' 字符
  const removeSlash = useCallback(() => {
    if (!slashRangeRef.current) return;

    try {
      const range = slashRangeRef.current;
      const textNode = range.startContainer;
      const offset = range.startOffset;

      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        // 删除 '/' 字符
        const newText = text.substring(0, offset - 1) + text.substring(offset);
        textNode.textContent = newText;

        // 恢复光标位置
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStart(textNode, offset - 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } catch (e) {
      console.error('Error removing slash:', e);
    }

    slashRangeRef.current = null;
  }, []);

  // 插入表格
  const insertTable = useCallback((rows: number, cols: number) => {
    const vditor = vditorInstanceRef.current;
    if (!vditor) return;

    // 删除 '/' 字符
    removeSlash();

    // 生成表格 Markdown
    let tableMarkdown = '\n';
    // 表头
    tableMarkdown += '|' + ' 列 '.repeat(cols) + '|\n';
    // 分隔符
    tableMarkdown += '|' + ' --- |'.repeat(cols) + '\n';
    // 数据行
    for (let i = 0; i < rows - 1; i++) {
      tableMarkdown += '|' + '     |'.repeat(cols) + '\n';
    }
    tableMarkdown += '\n';

    setTimeout(() => {
      vditor.insertValue(tableMarkdown);
    }, 0);
  }, [removeSlash]);

  // 处理 '/' 快捷键
  const handleSlashKey = useCallback((event: KeyboardEvent) => {
    if (event.key === '/') {
      // 保存当前选区，用于后续删除 '/'
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        slashRangeRef.current = range;
      }

      const position = getCursorPosition();
      setToolbarPosition(position);
      setShowSlashToolbar(true);
      return false;
    }
    return true;
  }, [getCursorPosition]);

  // 处理工具栏关闭
  const handleToolbarClose = useCallback(() => {
    setShowSlashToolbar(false);
    // 如果关闭时没有选择操作，需要删除 '/'
    removeSlash();
  }, [removeSlash]);

  // 处理插入表格
  const handleInsertTable = useCallback((rows: number, cols: number) => {
    setShowSlashToolbar(false);
    insertTable(rows, cols);
  }, [insertTable]);

  useEffect(() => {
    const element = vditorRef.current;
    if (!element) return;

    // 延迟初始化，确保 DOM 已准备好
    const timer = setTimeout(() => {
      vditorInstanceRef.current = new Vditor(element, {
        height: '100%',
        mode: 'ir',
        theme: 'classic',
        icon: 'ant',
        cache: {
          enable: false,
        },
        preview: {
          theme: {
            current: 'light',
          },
        },
        toolbarConfig: {
          hide: true,
        },
        input: (value: string) => {
          onChange(value);
        },
        after: () => {
          if (vditorInstanceRef.current) {
            vditorInstanceRef.current.setValue(content);
          }
        },
        // 添加快捷键支持
        keydown: (event: KeyboardEvent) => {
          // '/' 键触发工具栏
          if (event.key === '/' && !showSlashToolbar) {
            return handleSlashKey(event);
          }

          // Ctrl+S 或 Cmd+S 保存
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSave?.();
            return false;
          }
        },
      });
    }, 0);

    // 处理窗口大小变化
    const handleResize = () => {
      // 使用防抖避免频繁触发
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        try {
          const vditor = vditorInstanceRef.current;
          if (vditor && (vditor as any).vditor && (vditor as any).vditor.element) {
            // 触发 Vditor 重新计算布局
            const currentValue = vditor.getValue();
            vditor.setValue(currentValue);
          }
        } catch (e) {
          // 忽略错误
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      try {
        vditorInstanceRef.current?.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      vditorInstanceRef.current = null;
    };
  }, []);

  return (
    <>
      <div ref={vditorRef} style={{ height: '100%', flex: 1, minWidth: 0 }} />
      <SlashToolbar
        isOpen={showSlashToolbar}
        position={toolbarPosition}
        onClose={handleToolbarClose}
        onInsertTable={handleInsertTable}
      />
    </>
  );
}
