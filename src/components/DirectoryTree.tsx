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
}

// 用于标识正在创建的新节点
interface CreatingNode {
  parentPath: string;
  type: 'file' | 'folder';
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
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  creatingNode,
  onCancelCreating,
  level = 0,
}: {
  node: FileNode;
  currentFile: string | null;
  onFileSelect: (path: string) => void;
  onCreateFile?: (parentPath: string, name: string) => void;
  onCreateFolder?: (parentPath: string, name: string) => void;
  creatingNode: CreatingNode | null;
  onCancelCreating: () => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const isSelected = node.path === currentFile;

  // 检查是否正在此节点下创建新节点
  const isCreatingHere = creatingNode?.parentPath === node.path;

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCreateFile = () => {
    setShowContextMenu(false);
    setIsExpanded(true);
    onCreateFile?.(node.path, '');
  };

  const handleCreateFolder = () => {
    setShowContextMenu(false);
    setIsExpanded(true);
    onCreateFolder?.(node.path, '');
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
        className={`tree-item ${isSelected ? 'selected' : ''}`}
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
              onFileSelect={onFileSelect}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
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
          </div>
        </>
      )}
    </div>
  );
}

export function DirectoryTree({ files, currentFile, onFileSelect, onCreateFile, onCreateFolder }: DirectoryTreeProps) {
  const [creatingNode, setCreatingNode] = useState<CreatingNode | null>(null);

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

  return (
    <div className="directory-tree">
      <div className="tree-header">
        <span>文件目录</span>
      </div>
      <div className="tree-content">
        {files.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            currentFile={currentFile}
            onFileSelect={onFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            creatingNode={creatingNode}
            onCancelCreating={handleCancelCreating}
          />
        ))}
      </div>
    </div>
  );
}
