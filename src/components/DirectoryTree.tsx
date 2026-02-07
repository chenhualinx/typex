import { useState, useRef, useEffect } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  RightOutlined,
  DownOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import './DirectoryTree.css';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface DirectoryTreeProps {
  files: FileNode[];
  currentFile: string | null;
  onFileSelect: (path: string) => void;
  onCreateFile?: (parentPath: string, name: string) => void;
  onCreateFolder?: (parentPath: string, name: string) => void;
  onDeleteFiles?: (paths: string[]) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onOpenInFinder?: (path: string) => void;
  rootPath?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// 用于标识正在创建的新节点
interface CreatingNode {
  parentPath: string;
  type: 'file' | 'folder';
}

// 重命名状态
interface RenamingNode {
  path: string;
  name: string;
}

// 删除确认状态
interface DeleteConfirm {
  paths: string[];
  showConfirm: boolean;
}

function FileIcon({ isDirectory, isOpen, fileName }: { isDirectory: boolean; isOpen?: boolean; fileName?: string }) {
  if (isDirectory) {
    return isOpen ? (
      <FolderOpenOutlined className="file-icon" />
    ) : (
      <FolderOutlined className="file-icon" />
    );
  }

  // 根据文件后缀返回对应的图标
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return <FileMarkdownOutlined className="file-icon" />;
    case 'txt':
    case 'log':
    case 'ini':
    case 'conf':
    case 'config':
      return <FileTextOutlined className="file-icon" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      return <FileImageOutlined className="file-icon" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FileZipOutlined className="file-icon" />;
    case 'pdf':
      return <FilePdfOutlined className="file-icon" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileExcelOutlined className="file-icon" />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined className="file-icon" />;
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined className="file-icon" />;
    default:
      return <FileOutlined className="file-icon" />;
  }
}

// 新建节点输入组件
function NewNodeInput({
  type,
  onConfirm,
  onCancel,
  level,
}: {
  type: 'file' | 'folder';
  onConfirm: (name: string) => void;
  onCancel: () => void;
  level: number;
}) {
  const [value, setValue] = useState(type === 'file' ? '.md' : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (type === 'file') {
      // 选中 .md 之前的部分
      const dotIndex = value.lastIndexOf('.');
      if (dotIndex > 0) {
        inputRef.current?.setSelectionRange(0, dotIndex);
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (value.trim()) {
        onConfirm(value.trim());
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (value.trim()) {
      onConfirm(value.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="tree-item new-node-item"
      style={{ paddingLeft: `${level * 16 + 28}px` }}
    >
      <FileIcon isDirectory={type === 'folder'} isOpen={false} />
      <input
        ref={inputRef}
        className="new-node-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={type === 'folder' ? '文件夹名称' : '文件名'}
      />
    </div>
  );
}

// 重命名输入组件
function RenameInput({
  initialName,
  onConfirm,
  onCancel,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // 只选中文件名部分（不含后缀）
    const dotIndex = initialName.lastIndexOf('.');
    if (dotIndex > 0) {
      inputRef.current?.setSelectionRange(0, dotIndex);
    } else {
      inputRef.current?.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (value.trim() && value.trim() !== initialName) {
        onConfirm(value.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (value.trim() && value.trim() !== initialName) {
      onConfirm(value.trim());
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className="rename-input"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}

function TreeNode({
  node,
  currentFile,
  selectedPaths,
  onFileSelect,
  onToggleSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteRequest,
  onRenameRequest,
  creatingNode,
  renamingNode,
  onCancelCreating,
  onCancelRenaming,
  level = 0,
}: {
  node: FileNode;
  currentFile: string | null;
  selectedPaths: Set<string>;
  onFileSelect: (path: string) => void;
  onToggleSelect: (path: string) => void;
  onCreateFile?: (parentPath: string, name: string) => void;
  onCreateFolder?: (parentPath: string, name: string) => void;
  onDeleteRequest?: (paths: string[]) => void;
  onRenameRequest?: (path: string, newName: string) => void;
  creatingNode: CreatingNode | null;
  renamingNode: RenamingNode | null;
  onCancelCreating: () => void;
  onCancelRenaming: () => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const isSelected = node.path === currentFile;
  const isChecked = selectedPaths.has(node.path);

  // 检查是否正在此节点下创建新节点
  const isCreatingHere = creatingNode?.parentPath === node.path;
  // 检查是否正在重命名此节点
  const isRenamingHere = renamingNode?.path === node.path;

  const handleClick = (e: React.MouseEvent) => {
    if (isRenamingHere) return;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + 点击 = 多选
      e.stopPropagation();
      onToggleSelect(node.path);
    } else if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCreateFile = () => {
    setShowContextMenu(false);
    if (node.isDirectory) {
      setIsExpanded(true);
      onCreateFile?.(node.path, '');
    }
  };

  const handleCreateFolder = () => {
    setShowContextMenu(false);
    if (node.isDirectory) {
      setIsExpanded(true);
      onCreateFolder?.(node.path, '');
    }
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    // 如果有选中的项目，删除所有选中的；否则删除当前项
    const pathsToDelete = selectedPaths.size > 0 ? Array.from(selectedPaths) : [node.path];
    onDeleteRequest?.(pathsToDelete);
  };

  const handleRename = () => {
    setShowContextMenu(false);
    onRenameRequest?.(node.path, '');
  };

  const handleConfirmCreate = (name: string) => {
    if (creatingNode?.type === 'file') {
      onCreateFile?.(node.path, name);
    } else {
      onCreateFolder?.(node.path, name);
    }
  };

  const handleConfirmRename = (newName: string) => {
    onRenameRequest?.(node.path, newName);
    onCancelRenaming();
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-item ${isSelected ? 'selected' : ''} ${isChecked ? 'checked' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded ? <DownOutlined /> : <RightOutlined />}
          </span>
        )}
        <FileIcon isDirectory={node.isDirectory} isOpen={isExpanded} fileName={node.name} />
        {isRenamingHere ? (
          <RenameInput
            initialName={node.name}
            onConfirm={handleConfirmRename}
            onCancel={onCancelRenaming}
          />
        ) : (
          <span className="file-name">{node.name}</span>
        )}
      </div>
      {node.isDirectory && isExpanded && (
        <div className="tree-children">
          {/* 正在创建的新节点输入框 */}
          {isCreatingHere && creatingNode && (
            <NewNodeInput
              type={creatingNode.type}
              onConfirm={handleConfirmCreate}
              onCancel={onCancelCreating}
              level={level + 1}
            />
          )}
          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              currentFile={currentFile}
              selectedPaths={selectedPaths}
              onFileSelect={onFileSelect}
              onToggleSelect={onToggleSelect}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteRequest={onDeleteRequest}
              onRenameRequest={onRenameRequest}
              creatingNode={creatingNode}
              renamingNode={renamingNode}
              onCancelCreating={onCancelCreating}
              onCancelRenaming={onCancelRenaming}
              level={level + 1}
            />
          ))}
        </div>
      )}
      {showContextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="context-menu"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <div className="context-menu-item" onClick={handleRename}>
              <EditOutlined />
              重命名
            </div>
            {node.isDirectory && (
              <>
                <div className="context-menu-divider" />
                <div className="context-menu-item" onClick={handleCreateFile}>
                  <FileAddOutlined />
                  新建文件
                </div>
                <div className="context-menu-item" onClick={handleCreateFolder}>
                  <FolderAddOutlined />
                  新建文件夹
                </div>
              </>
            )}
            <div className="context-menu-divider" />
            <div className="context-menu-item delete" onClick={handleDelete}>
              <DeleteOutlined />
              删除
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DirectoryTree({ files, currentFile, onFileSelect, onCreateFile, onCreateFolder, onDeleteFiles, onRenameFile, rootPath, collapsed, onToggleCollapse }: DirectoryTreeProps) {
  const [creatingNode, setCreatingNode] = useState<CreatingNode | null>(null);
  const [renamingNode, setRenamingNode] = useState<RenamingNode | null>(null);
  const [showRootContextMenu, setShowRootContextMenu] = useState(false);
  const [rootContextMenuPos, setRootContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

  const handleCreateFile = (parentPath: string, name: string) => {
    if (name === '') {
      // 开始创建，显示输入框
      setCreatingNode({ parentPath, type: 'file' });
    } else {
      // 确认创建
      onCreateFile?.(parentPath, name);
      setCreatingNode(null);
    }
  };

  const handleCreateFolder = (parentPath: string, name: string) => {
    if (name === '') {
      // 开始创建，显示输入框
      setCreatingNode({ parentPath, type: 'folder' });
    } else {
      // 确认创建
      onCreateFolder?.(parentPath, name);
      setCreatingNode(null);
    }
  };

  const handleCancelCreating = () => {
    setCreatingNode(null);
  };

  const handleRenameRequest = (path: string, newName: string) => {
    if (newName === '') {
      // 开始重命名，显示输入框
      const name = path.split(/[\\/]/).pop() || '';
      setRenamingNode({ path, name });
    } else {
      // 确认重命名
      const separator = path.includes('\\') ? '\\' : '/';
      const lastSepIndex = path.lastIndexOf(separator);
      const parentPath = lastSepIndex >= 0 ? path.substring(0, lastSepIndex + 1) : '';
      const newPath = parentPath + newName;
      console.log('Renaming:', path, '->', newPath);
      onRenameFile?.(path, newPath);
      setRenamingNode(null);
    }
  };

  const handleCancelRenaming = () => {
    setRenamingNode(null);
  };

  // 检查是否在根目录创建
  const isCreatingAtRoot = creatingNode?.parentPath === rootPath;

  const handleRootContextMenu = (e: React.MouseEvent) => {
    if (!rootPath) return;
    e.preventDefault();
    setRootContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowRootContextMenu(true);
  };

  const handleRootCreateFile = () => {
    setShowRootContextMenu(false);
    if (rootPath) {
      handleCreateFile(rootPath, '');
    }
  };

  const handleRootCreateFolder = () => {
    setShowRootContextMenu(false);
    if (rootPath) {
      handleCreateFolder(rootPath, '');
    }
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleDeleteRequest = (paths: string[]) => {
    setDeleteConfirm({ paths, showConfirm: true });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDeleteFiles?.(deleteConfirm.paths);
      setSelectedPaths(new Set());
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const clearSelection = () => {
    setSelectedPaths(new Set());
  };

  if (collapsed) {
    return (
      <div className="directory-tree collapsed">
        <button className="toggle-sidebar-btn" onClick={onToggleCollapse} title="展开目录树 (Cmd+B)">
          <MenuUnfoldOutlined />
        </button>
      </div>
    );
  }

  return (
    <div className="directory-tree">
      <div className="tree-header">
        <div className="tree-header-content">
          <span className="tree-header-path" title={rootPath}>
            {rootPath ? rootPath.split(/[\\/]/).pop() || '文件目录' : '文件目录'}
          </span>
          <button className="toggle-sidebar-btn" onClick={onToggleCollapse} title="折叠目录树 (Cmd+B)">
            <MenuFoldOutlined />
          </button>
        </div>
        {selectedPaths.size > 0 && (
          <div className="selection-info">
            <span className="selection-count">已选择 {selectedPaths.size} 项</span>
            <button className="clear-selection-btn" onClick={clearSelection}>
              清除
            </button>
          </div>
        )}
      </div>
      <div className="tree-content" onContextMenu={handleRootContextMenu}>
        {/* 删除确认栏 */}
        {deleteConfirm?.showConfirm && (
          <div className="delete-confirm-panel">
            <div className="delete-confirm-header">
              <span className="delete-confirm-title">确定要删除以下项目吗？</span>
            </div>
            <div className="delete-confirm-list">
              {deleteConfirm.paths.map(path => {
                const name = path.split('/').pop() || path.split('\\').pop() || path;
                return (
                  <div key={path} className="delete-confirm-item">
                    {name}
                  </div>
                );
              })}
            </div>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-btn cancel" onClick={handleCancelDelete}>
                取消
              </button>
              <button className="delete-confirm-btn confirm" onClick={handleConfirmDelete}>
                删除 ({deleteConfirm.paths.length})
              </button>
            </div>
          </div>
        )}
        {/* 根目录创建输入框 */}
        {isCreatingAtRoot && creatingNode && rootPath && (
          <NewNodeInput
            type={creatingNode.type}
            onConfirm={(name) => {
              if (creatingNode.type === 'file') {
                onCreateFile?.(rootPath, name);
              } else {
                onCreateFolder?.(rootPath, name);
              }
              setCreatingNode(null);
            }}
            onCancel={handleCancelCreating}
            level={0}
          />
        )}
        {files.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            currentFile={currentFile}
            selectedPaths={selectedPaths}
            onFileSelect={onFileSelect}
            onToggleSelect={handleToggleSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteRequest={handleDeleteRequest}
            onRenameRequest={handleRenameRequest}
            creatingNode={creatingNode}
            renamingNode={renamingNode}
            onCancelCreating={handleCancelCreating}
            onCancelRenaming={handleCancelRenaming}
          />
        ))}
      </div>
      {showRootContextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setShowRootContextMenu(false)}
          />
          <div
            className="context-menu"
            style={{ left: rootContextMenuPos.x, top: rootContextMenuPos.y }}
          >
            <div className="context-menu-item" onClick={handleRootCreateFile}>
              <FileAddOutlined />
              新建文件
            </div>
            <div className="context-menu-item" onClick={handleRootCreateFolder}>
              <FolderAddOutlined />
              新建文件夹
            </div>
          </div>
        </>
      )}
    </div>
  );
}
