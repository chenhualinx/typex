import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { MarkdownEditor } from './components/MarkdownEditor';
import { DirectoryTree, FileNode } from './components/DirectoryTree';
import './App.css';

interface RustFileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: RustFileNode[];
}

function convertFileNode(rustNode: RustFileNode): FileNode {
  return {
    name: rustNode.name,
    path: rustNode.path,
    isDirectory: rustNode.is_directory,
    children: rustNode.children?.map(convertFileNode),
  };
}

function App() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // 使用 ref 来存储最新的状态，避免闭包问题
  const currentFileRef = useRef(currentFile);
  const currentContentRef = useRef(currentContent);
  const isModifiedRef = useRef(isModified);

  // 同步 ref
  currentFileRef.current = currentFile;
  currentContentRef.current = currentContent;
  isModifiedRef.current = isModified;

  const handleSave = useCallback(async () => {
    const file = currentFileRef.current;
    const content = currentContentRef.current;
    if (!file) {
      console.log('No file to save');
      return;
    }

    console.log('Saving file:', file);
    try {
      await invoke('write_file', {
        path: file,
        content: content,
      });
      setOriginalContent(content);
      setIsModified(false);
      console.log('File saved successfully');
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('保存失败: ' + error);
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        const result = await invoke<RustFileNode[]>('read_directory', { path: selected });
        setFiles(result.map(convertFileNode));
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, []);

  const handleFileSelect = useCallback(async (path: string) => {
    console.log('File selected:', path);
    
    // 如果当前文件有未保存的更改，提示用户
    if (isModifiedRef.current) {
      const shouldSave = confirm('当前文件有未保存的更改，是否保存？');
      if (shouldSave) {
        await handleSave();
      }
    }

    try {
      const content = await invoke<string>('read_file', { path });
      console.log('File content loaded, length:', content.length);
      setCurrentFile(path);
      setCurrentContent(content);
      setOriginalContent(content);
      setIsModified(false);
      // 强制重新创建编辑器
      setEditorKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }, [handleSave]);

  const handleContentChange = useCallback((content: string) => {
    setCurrentContent(content);
    setIsModified(content !== originalContent);
  }, [originalContent]);

  const getFileName = (path: string | null) => {
    if (!path) return '';
    return path.split('/').pop() || path.split('\\').pop() || '';
  };

  // 监听菜单事件
  useEffect(() => {
    const unlisten = listen('menu-event', (event) => {
      const action = event.payload as string;
      console.log('Menu event received:', action);
      
      switch (action) {
        case 'open_folder':
          handleOpenFolder();
          break;
        case 'save_file':
          handleSave();
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [handleOpenFolder, handleSave]);

  return (
    <div className="app">
      <div className="main-content">
        {files.length > 0 && (
          <DirectoryTree
            files={files}
            currentFile={currentFile}
            onFileSelect={handleFileSelect}
          />
        )}
        <div className="editor-container">
          {currentFile ? (
            <MarkdownEditor
              key={`${currentFile}-${editorKey}`}
              content={currentContent}
              onChange={handleContentChange}
              onSave={handleSave}
            />
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <p>选择一个 Markdown 文件开始编辑</p>
              <p style={{ fontSize: '12px', color: '#999' }}>或使用菜单 文件 &gt; 打开文件夹</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
