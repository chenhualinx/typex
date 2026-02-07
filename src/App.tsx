import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { FileTextOutlined, FolderOpenOutlined } from '@ant-design/icons';
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

const SIDEBAR_COLLAPSED_KEY = 'typex:sidebar-collapsed';
const RECENT_FOLDERS_KEY = 'typex:recent-folders';

function App() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [openedFolderPath, setOpenedFolderPath] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [recentFolders, setRecentFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem(RECENT_FOLDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

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

  // 添加文件夹到最近访问记录
  const addToRecentFolders = useCallback((folderPath: string) => {
    setRecentFolders(prev => {
      const newList = [folderPath, ...prev.filter(p => p !== folderPath)].slice(0, 5);
      localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(newList));
      return newList;
    });
  }, []);

  // 打开指定文件夹
  const openFolder = useCallback(async (folderPath: string) => {
    try {
      setOpenedFolderPath(folderPath);
      const result = await invoke<RustFileNode[]>('read_directory', { path: folderPath });
      setFiles(result.map(convertFileNode));
      addToRecentFolders(folderPath);
    } catch (error) {
      console.error('Failed to open folder:', error);
      alert('打开文件夹失败: ' + error);
    }
  }, [addToRecentFolders]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        await openFolder(selected);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [openFolder]);

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

  const handleRenameFile = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await invoke('rename_file', { oldPath, newPath });
      await refreshDirectory();
      // 如果重命名的是当前打开的文件，更新当前文件路径
      if (currentFile === oldPath) {
        setCurrentFile(newPath);
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert('重命名失败: ' + error);
    }
  }, [currentFile, refreshDirectory]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newValue));
      return newValue;
    });
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
        case 'toggle_sidebar':
          handleToggleSidebar();
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [handleOpenFolder, handleSave, handleToggleSidebar]);

  // 监听键盘快捷键 Cmd+B / Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar]);

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
            onRenameFile={handleRenameFile}
            onOpenInFinder={handleOpenInFinder}
            rootPath={rootPath}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
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
              {!openedFolderPath && (
                <>
                  <FileTextOutlined style={{ fontSize: 64, color: '#ccc' }} />
                  <p>选择一个 Markdown 文件开始编辑</p>
                </>
              )}
              {!openedFolderPath && recentFolders.length > 0 && (
                <div style={{ marginTop: '16px', textAlign: 'left', minWidth: '280px' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>最近访问</p>
                  {recentFolders.map((folder) => (
                    <div
                      key={folder}
                      onClick={() => openFolder(folder)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 10px',
                        marginBottom: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: '#f5f5f5',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e8e8e8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }}
                    >
                      <FolderOpenOutlined className="recent-folder-icon" style={{ marginRight: '6px', color: '#999' }} />
                      <span
                        style={{
                          fontSize: '14px',
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={folder}
                      >
                        {folder}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
