import { useState, useEffect, useRef } from 'react';
import { TableOutlined } from '@ant-design/icons';
import './SlashToolbar.css';

interface SlashToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertTable: (rows: number, cols: number) => void;
}

export function SlashToolbar({ isOpen, position, onClose, onInsertTable }: SlashToolbarProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [selected, setSelected] = useState(true);
  const rowsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRows(3);
      setCols(3);
      setSelected(true);
      setTimeout(() => rowsInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rows, cols, onClose]);

  const handleInsert = () => {
    const validRows = Math.max(1, Math.min(20, rows));
    const validCols = Math.max(1, Math.min(10, cols));
    onInsertTable(validRows, validCols);
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setRows(isNaN(value) ? 1 : value);
  };

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCols(isNaN(value) ? 1 : value);
  };

  // 调整位置确保不超出视口
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 280),
    y: Math.min(position.y, window.innerHeight - 80),
  };

  if (!isOpen) return null;

  return (
    <div className="slash-toolbar-overlay" onClick={onClose}>
      <div
        className="slash-toolbar"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slash-toolbar-title">基本</div>
        <div
          className={`slash-toolbar-item ${selected ? 'selected' : ''}`}
          onMouseEnter={() => setSelected(true)}
        >
          <div className="slash-toolbar-icon">
            <TableOutlined />
          </div>
          <div className="slash-toolbar-text">
            <span className="slash-toolbar-label">表格</span>
            <span className="slash-toolbar-desc">插入 Markdown 表格</span>
          </div>
          <div className="table-inputs">
            <input
              ref={rowsInputRef}
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={handleRowsChange}
              className="table-input"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="table-input-label">行</span>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={handleColsChange}
              className="table-input"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="table-input-label">列</span>
            <button
              className="table-insert-btn"
              onClick={handleInsert}
            >
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
