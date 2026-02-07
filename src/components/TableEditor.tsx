import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlusOutlined,
  DeleteOutlined,
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  InsertRowLeftOutlined,
  InsertRowRightOutlined,
} from '@ant-design/icons';
import './TableEditor.css';

interface TableCell {
  content: string;
  isHeader: boolean;
  align?: 'left' | 'center' | 'right';
}

interface TableData {
  rows: TableCell[][];
}

interface TableEditorProps {
  initialData?: TableData;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
}

export function TableEditor({ initialData, onChange, readOnly = false }: TableEditorProps) {
  const [data, setData] = useState<TableData>(() => {
    if (initialData) return initialData;
    // 默认创建一个 3x3 的表格
    return {
      rows: [
        [
          { content: '列 1', isHeader: true },
          { content: '列 2', isHeader: true },
          { content: '列 3', isHeader: true },
        ],
        [
          { content: '', isHeader: false },
          { content: '', isHeader: false },
          { content: '', isHeader: false },
        ],
        [
          { content: '', isHeader: false },
          { content: '', isHeader: false },
          { content: '', isHeader: false },
        ],
      ],
    };
  });

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showRowMenu, setShowRowMenu] = useState<number | null>(null);
  const [showColMenu, setShowColMenu] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 将表格数据转换为 Markdown
  const toMarkdown = useCallback((tableData: TableData): string => {
    if (tableData.rows.length === 0) return '';

    let markdown = '\n';
    const colCount = tableData.rows[0]?.length || 0;

    tableData.rows.forEach((row, rowIndex) => {
      const cells = row.map((cell) => ` ${cell.content} `).join('|');
      markdown += `|${cells}|\n`;

      // 在表头后添加分隔符
      if (rowIndex === 0) {
        const separators = Array(colCount).fill(' --- ').join('|');
        markdown += `|${separators}|\n`;
      }
    });

    markdown += '\n';
    return markdown;
  }, []);

  // 当数据变化时通知父组件
  useEffect(() => {
    if (onChange) {
      onChange(toMarkdown(data));
    }
  }, [data, onChange, toMarkdown]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowRowMenu(null);
        setShowColMenu(null);
        setSelectedCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 更新单元格内容
  const updateCell = useCallback((rowIndex: number, colIndex: number, content: string) => {
    setData((prev) => {
      const newRows = prev.rows.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          rIdx === rowIndex && cIdx === colIndex ? { ...cell, content } : cell
        )
      );
      return { ...prev, rows: newRows };
    });
  }, []);

  // 在指定位置插入行
  const insertRow = useCallback((rowIndex: number, position: 'above' | 'below') => {
    setData((prev) => {
      const colCount = prev.rows[0]?.length || 0;
      const newRow: TableCell[] = Array(colCount)
        .fill(null)
        .map((_, i) => ({
          content: '',
          isHeader: false,
          align: prev.rows[0]?.[i]?.align,
        }));

      const insertIndex = position === 'above' ? rowIndex : rowIndex + 1;
      const newRows = [...prev.rows];
      newRows.splice(insertIndex, 0, newRow);

      return { ...prev, rows: newRows };
    });
    setShowRowMenu(null);
  }, []);

  // 在指定位置插入列
  const insertColumn = useCallback((colIndex: number, position: 'left' | 'right') => {
    setData((prev) => {
      const insertIndex = position === 'left' ? colIndex : colIndex + 1;
      const newRows = prev.rows.map((row, rowIndex) => {
        const newCell: TableCell = {
          content: rowIndex === 0 ? `列 ${insertIndex + 1}` : '',
          isHeader: rowIndex === 0,
        };
        const newRow = [...row];
        newRow.splice(insertIndex, 0, newCell);
        return newRow;
      });

      return { ...prev, rows: newRows };
    });
    setShowColMenu(null);
  }, []);

  // 删除行
  const deleteRow = useCallback((rowIndex: number) => {
    setData((prev) => {
      if (prev.rows.length <= 1) return prev; // 至少保留一行
      const newRows = prev.rows.filter((_, idx) => idx !== rowIndex);
      return { ...prev, rows: newRows };
    });
    setShowRowMenu(null);
  }, []);

  // 删除列
  const deleteColumn = useCallback((colIndex: number) => {
    setData((prev) => {
      if (prev.rows[0]?.length <= 1) return prev; // 至少保留一列
      const newRows = prev.rows.map((row) => row.filter((_, idx) => idx !== colIndex));
      return { ...prev, rows: newRows };
    });
    setShowColMenu(null);
  }, []);

  if (readOnly) {
    return (
      <div className="vditor-table-wrapper" ref={wrapperRef}>
        <table>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) =>
                  cell.isHeader ? (
                    <th key={colIndex} style={{ textAlign: cell.align || 'center' }}>
                      {cell.content}
                    </th>
                  ) : (
                    <td key={colIndex} style={{ textAlign: cell.align || 'left' }}>
                      {cell.content}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={`vditor-table-wrapper ${selectedCell ? 'has-focus' : ''}`}
      ref={wrapperRef}
    >
      {/* 左上角添加按钮 */}
      <button
        className="table-corner-btn"
        onClick={() => {
          insertRow(0, 'above');
          insertColumn(0, 'left');
        }}
        title="添加行列"
      >
        <PlusOutlined />
      </button>

      {/* 列操作按钮 */}
      {data.rows[0]?.map((_, colIndex) => (
        <button
          key={`col-${colIndex}`}
          className="table-action-btn table-col-action"
          style={{ left: `${colIndex * 100 + 50}px` }}
          onClick={() => setShowColMenu(colIndex)}
          title="列操作"
        >
          <PlusOutlined />
        </button>
      ))}

      {/* 行操作按钮 */}
      {data.rows.map((_, rowIndex) => (
        <button
          key={`row-${rowIndex}`}
          className="table-action-btn table-row-action"
          style={{ top: `${rowIndex * 40 + 20}px` }}
          onClick={() => setShowRowMenu(rowIndex)}
          title="行操作"
        >
          <PlusOutlined />
        </button>
      ))}

      {/* 行操作菜单 */}
      {showRowMenu !== null && (
        <div
          className="table-context-menu"
          style={{ top: `${showRowMenu * 40 + 20}px`, left: '-160px' }}
        >
          <div className="table-context-menu-item" onClick={() => insertRow(showRowMenu, 'above')}>
            <InsertRowAboveOutlined />
            <span>在上方插入行</span>
          </div>
          <div className="table-context-menu-item" onClick={() => insertRow(showRowMenu, 'below')}>
            <InsertRowBelowOutlined />
            <span>在下方插入行</span>
          </div>
          <div className="table-context-menu-divider" />
          <div className="table-context-menu-item" onClick={() => deleteRow(showRowMenu)}>
            <DeleteOutlined />
            <span>删除行</span>
          </div>
        </div>
      )}

      {/* 列操作菜单 */}
      {showColMenu !== null && (
        <div
          className="table-context-menu"
          style={{ top: '-120px', left: `${showColMenu * 100 + 20}px` }}
        >
          <div className="table-context-menu-item" onClick={() => insertColumn(showColMenu, 'left')}>
            <InsertRowLeftOutlined />
            <span>在左侧插入列</span>
          </div>
          <div className="table-context-menu-item" onClick={() => insertColumn(showColMenu, 'right')}>
            <InsertRowRightOutlined />
            <span>在右侧插入列</span>
          </div>
          <div className="table-context-menu-divider" />
          <div className="table-context-menu-item" onClick={() => deleteColumn(showColMenu)}>
            <DeleteOutlined />
            <span>删除列</span>
          </div>
        </div>
      )}

      {/* 表格 */}
      <table>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) =>
                cell.isHeader ? (
                  <th
                    key={colIndex}
                    style={{ textAlign: cell.align || 'center' }}
                    className={selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'selected' : ''}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                  >
                    <input
                      type="text"
                      value={cell.content}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: cell.align || 'center',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  </th>
                ) : (
                  <td
                    key={colIndex}
                    style={{ textAlign: cell.align || 'left' }}
                    className={selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'selected' : ''}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                  >
                    <input
                      type="text"
                      value={cell.content}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: cell.align || 'left',
                        outline: 'none',
                      }}
                    />
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 解析 Markdown 表格为 TableData
export function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown.trim().split('\n').filter((line) => line.trim());
  if (lines.length < 2) return null;

  const rows: TableCell[][] = [];

  lines.forEach((line, index) => {
    // 跳过分隔符行
    if (index === 1 && line.includes('---')) return;

    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => ({
        content: cell.trim(),
        isHeader: index === 0,
      }));

    rows.push(cells);
  });

  return { rows };
}

export default TableEditor;
