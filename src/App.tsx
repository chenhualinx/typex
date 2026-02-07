import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { FileTextOutlined } from '@ant-design/icons';
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
  const [openedFolderPath, setOpenedFolderPath] = useState<string | null>(null);

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

  // 使用打开文件夹时保存的路径
  const rootPath = openedFolderPath;

  const refreshDirectory = useCallback(async () => {
    if (!rootPath) return;
    
    try {
      const result = await invoke<RustFileNode[]>('read_directory', { path: rootPath });
      setFiles(result.map(convertFileNode));
    } catch (error) {
      console.error('Failed to refresh directory:', error);
    }
  }, [rootPath]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        setOpenedFolderPath(selected);
        const result = await invoke<RustFileNode[]>('read_directory', { path: selected });
        setFiles(result.map(convertFileNode));
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, []);

  const handleCreateFile = useCallback(async (parentPath: string, name: string) => {
    try {
      const newPath = `${parentPath}/${name}`;
      await invoke('create_file', { path: newPath });
      await refreshDirectory();
      // 自动打开新创建的文件
      const content = await invoke<string>('read_file', { path: newPath });
      setCurrentFile(newPath);
      setCurrentContent(content);
      setOriginalContent(content);
      setIsModified(false);
      setEditorKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('创建文件失败: ' + error);
    }
  }, [refreshDirectory]);

  const handleCreateFolder = useCallback(async (parentPath: string, name: string) => {
    try {
      const newPath = `${parentPath}/${name}`;
      await invoke('create_folder', { path: newPath });
      await refreshDirectory();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('创建文件夹失败: ' + error);
    }
  }, [refreshDirectory]);

  const handleDeleteFiles = useCallback(async (paths: string[]) => {
    try {
      for (const path of paths) {
        // 根据路径在 files 中查找判断是文件还是文件夹
        const findNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
          for (const node of nodes) {
            if (node.path === targetPath) return node;
            if (node.children) {
              const found = findNode(node.children, targetPath);
              if (found) return found;
            }
          }
          return null;
        };
        
        const node = findNode(files, path);
        if (node?.isDirectory) {
          await invoke('delete_folder', { path });
        } else {
          await invoke('delete_file', { path });
        }
      }
      await refreshDirectory();
      // 如果当前打开的文件被删除了，清空编辑器
      if (currentFile && paths.includes(currentFile)) {
        setCurrentFile(null);
        setCurrentContent('');
        setOriginalContent('');
        setIsModified(false);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error);
    }
  }, [refreshDirectory, files, currentFile]);

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

  const handleOpenInFinder = useCallback(async (path: string) => {
    try {
      await revealItemInDir(path);
    } catch (error) {
      console.error('Failed to open in finder:', error);
    }
  }, []);

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
        {rootPath && (
          <DirectoryTree
            files={files}
            currentFile={currentFile}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFiles={handleDeleteFiles}
            onOpenInFinder={handleOpenInFinder}
            rootPath={rootPath}
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
              <FileTextOutlined style={{ fontSize: 64, color: '#ccc' }} />
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
