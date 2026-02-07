import { useState, useRef, useEffect } from 'react';
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
  rootPath?: string;
}

// 用于标识正在创建的新节点
interface CreatingNode {
  parentPath: string;
  type: 'file' | 'folder';
}

// 删除确认状态
interface DeleteConfirm {
  paths: string[];
  showConfirm: boolean;
}

function FileIcon({ isDirectory, isOpen }: { isDirectory: boolean; isOpen?: boolean }) {
  if (isDirectory) {
    return (
      <svg className="file-icon" viewBox="0 0 24 24" fill="currentColor">
        {isOpen ? (
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
        ) : (
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        )}
      </svg>
    );
  }
  return (
    <svg className="file-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
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
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
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

function TreeNode({
  node,
  currentFile,
  selectedPaths,
  onFileSelect,
  onToggleSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteRequest,
  creatingNode,
  onCancelCreating,
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
  creatingNode: CreatingNode | null;
  onCancelCreating: () => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const isSelected = node.path === currentFile;
  const isChecked = selectedPaths.has(node.path);

  // 检查是否正在此节点下创建新节点
  const isCreatingHere = creatingNode?.parentPath === node.path;

  const handleClick = (e: React.MouseEvent) => {
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

  const handleConfirmCreate = (name: string) => {
    if (creatingNode?.type === 'file') {
      onCreateFile?.(node.path, name);
    } else {
      onCreateFolder?.(node.path, name);
    }
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
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </span>
        )}
        <FileIcon isDirectory={node.isDirectory} isOpen={isExpanded} />
        <span className="file-name">{node.name}</span>
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
              creatingNode={creatingNode}
              onCancelCreating={onCancelCreating}
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
            {node.isDirectory && (
              <>
                <div className="context-menu-item" onClick={handleCreateFile}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                  新建文件
                </div>
                <div className="context-menu-item" onClick={handleCreateFolder}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                  </svg>
                  新建文件夹
                </div>
                <div className="context-menu-divider" />
              </>
            )}
            <div className="context-menu-item delete" onClick={handleDelete}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              删除
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DirectoryTree({ files, currentFile, onFileSelect, onCreateFile, onCreateFolder, onDeleteFiles, rootPath }: DirectoryTreeProps) {
  const [creatingNode, setCreatingNode] = useState<CreatingNode | null>(null);
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

  return (
    <div className="directory-tree">
      <div className="tree-header">
        <span>文件目录</span>
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
            creatingNode={creatingNode}
            onCancelCreating={handleCancelCreating}
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
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              新建文件
            </div>
            <div className="context-menu-item" onClick={handleRootCreateFolder}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
              </svg>
              新建文件夹
            </div>
          </div>
        </>
      )}
    </div>
  );
}
