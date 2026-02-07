import { useEffect, useRef } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export function MarkdownEditor({ content, onChange, onSave }: MarkdownEditorProps) {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstanceRef = useRef<Vditor | null>(null);

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
        toolbar: [
          'emoji',
          'headings',
          'bold',
          'italic',
          'strike',
          'link',
          '|',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'quote',
          'line',
          'code',
          'inline-code',
          'insert-before',
          'insert-after',
          '|',
          'upload',
          'record',
          'table',
          '|',
          'undo',
          'redo',
          '|',
          'fullscreen',
          'edit-mode',
          {
            name: 'save',
            tip: '保存 (Ctrl+S / Cmd+S)',
            tipPosition: 's',
            className: 'right',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M17.59 3.59c-.38-.38-.89-.59-1.42-.59H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7.83c0-.53-.21-1.04-.59-1.41l-2.82-2.83zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm1-10H7c-1.1 0-2-.9-2-2s.9-2 2-2h6c1.1 0 2 .9 2 2s-.9 2-2 2z" fill="currentColor"/></svg>',
            click: () => {
              onSave?.();
            },
          },
        ],
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
          // Ctrl+S 或 Cmd+S 保存
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSave?.();
            return false;
          }
        },
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      try {
        vditorInstanceRef.current?.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      vditorInstanceRef.current = null;
    };
  }, []);

  return <div ref={vditorRef} style={{ height: '100%', flex: 1, minWidth: 0 }} />;
}
