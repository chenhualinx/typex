import { useState } from 'react';
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

function TreeNode({
  node,
  currentFile,
  onFileSelect,
  level = 0,
}: {
  node: FileNode;
  currentFile: string | null;
  onFileSelect: (path: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = node.path === currentFile;

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
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
      {node.isDirectory && isExpanded && node.children && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectoryTree({ files, currentFile, onFileSelect }: DirectoryTreeProps) {
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
          />
        ))}
      </div>
    </div>
  );
}
