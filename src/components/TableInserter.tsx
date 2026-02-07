import { useState, useEffect, useRef } from 'react';
import './TableInserter.css';

interface TableInserterProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

export function TableInserter({ isOpen, onClose, onInsert }: TableInserterProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const rowsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRows(3);
      setCols(3);
      setTimeout(() => rowsInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const validRows = Math.max(1, Math.min(20, rows));
    const validCols = Math.max(1, Math.min(10, cols));
    onInsert(validRows, validCols);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="table-inserter-overlay" onClick={onClose}>
      <div className="table-inserter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="table-inserter-title">插入表格</div>
        <div className="table-inserter-row">
          <span className="table-inserter-label">行数:</span>
          <input
            ref={rowsInputRef}
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value) || 1)}
            onKeyDown={handleKeyDown}
            className="table-inserter-input"
          />
        </div>
        <div className="table-inserter-row">
          <span className="table-inserter-label">列数:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value) || 1)}
            onKeyDown={handleKeyDown}
            className="table-inserter-input"
          />
        </div>
        <div className="table-inserter-actions">
          <button className="table-inserter-btn" onClick={onClose}>
            取消
          </button>
          <button className="table-inserter-btn primary" onClick={handleSubmit}>
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
