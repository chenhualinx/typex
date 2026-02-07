import { useEffect, useRef, useCallback } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import './EnhancedTable.css';
import {
  parseMarkdown,
  findTables,
  insertRow as astInsertRow,
  deleteRow as astDeleteRow,
  insertColumn as astInsertColumn,
  deleteColumn as astDeleteColumn,
  createTable,
  tableToMarkdown,
} from '../utils/tableAst';
import type { Table } from 'mdast';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export function MarkdownEditor({ content, onChange, onSave }: MarkdownEditorProps) {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstanceRef = useRef<Vditor | null>(null);
  const isInternalUpdateRef = useRef(false);
  const contentRef = useRef(content);

  // 同步 contentRef 与 content prop
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // 为表格添加增强功能
  const enhanceTable = useCallback((tableElement: HTMLTableElement, tableIndex: number) => {
    if (tableElement.dataset.enhanced === 'true') return;
    tableElement.dataset.enhanced = 'true';

    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'enhanced-table-wrapper';

    if (tableElement.parentElement) {
      tableElement.parentElement.insertBefore(wrapper, tableElement);
      wrapper.appendChild(tableElement);
    }

    // 创建分隔线容器
    const dividersContainer = document.createElement('div');
    dividersContainer.className = 'table-dividers-container';
    wrapper.appendChild(dividersContainer);

    // 使用 AST 修改表格
    const modifyTable = (operation: (table: Table) => Table) => {
      console.log('[Table] modifyTable called');
      const vditor = vditorInstanceRef.current;
      if (!vditor) {
        console.log('[Table] vditor not found');
        return;
      }

      // 使用 contentRef 获取最新内容
      const currentContent = contentRef.current;
      console.log('[Table] Using contentRef:', JSON.stringify(currentContent).substring(0, 100));
      console.log('[Table] vditor.getValue():', JSON.stringify(vditor.getValue()).substring(0, 100));

      const ast = parseMarkdown(currentContent);
      console.log('[Table] AST parsed');

      const tables = findTables(ast);
      console.log('[Table] Found', tables.length, 'tables');

      if (tableIndex >= 0 && tableIndex < tables.length) {
        console.log('[Table] Modifying table at index', tableIndex);
        const oldTable = tables[tableIndex];
        const newTable = operation(oldTable);
        console.log('[Table] Operation completed');

        // 替换表格
        function replaceNode(node: any): any {
          if (node === oldTable) {
            return newTable;
          }
          if (node.children) {
            node.children = node.children.map(replaceNode);
          }
          return node;
        }

        const newAst = replaceNode(ast);
        console.log('[Table] Table replaced in AST');

        const newContent = tableToMarkdown(newAst as Table);
        console.log('[Table] New content:', JSON.stringify(newContent));

        // 标记为内部更新
        isInternalUpdateRef.current = true;

        // 使用 Vditor 的 API 替换内容
        const editorElement = vditor.vditor.ir?.element;
        if (editorElement) {
          // 找到表格元素并替换
          const tableElements = editorElement.querySelectorAll('table');
          if (tableElements[tableIndex]) {
            // 使用 Vditor 的 insertValue 方法
            const tableMarkdown = tableToMarkdown(newTable);
            // 选中表格并替换
            const tableNode = tableElements[tableIndex];
            const tableRange = document.createRange();
            const sel = window.getSelection();
            tableRange.selectNode(tableNode);
            sel?.removeAllRanges();
            sel?.addRange(tableRange);

            // 使用 deleteValue 删除选中内容，然后插入新内容
            vditor.deleteValue();
            vditor.insertValue(tableMarkdown, true);
          } else {
            // 回退到 setValue
            vditor.setValue(newContent);
          }
        } else {
          vditor.setValue(newContent);
        }

        onChange(newContent);
        console.log('[Table] Content updated');

        // 延迟重置标志并重新扫描表格
        setTimeout(() => {
          isInternalUpdateRef.current = false;
          console.log('[Table] Internal update flag reset, rescanning tables');
          // 重新扫描表格以恢复事件监听器
          scanAndEnhanceTables();
        }, 200);
      } else {
        console.log('[Table] Table index out of range:', tableIndex, '>=', tables.length);
      }
    };

    // 获取表格尺寸
    const getTableDimensions = () => {
      const rows = tableElement.rows.length;
      const cols = rows > 0 ? tableElement.rows[0].cells.length : 0;
      return { rows, cols };
    };

    // 创建列分隔线
    const createColumnDividers = () => {
      dividersContainer.innerHTML = '';
      const { cols } = getTableDimensions();

      // 创建列操作柄（在表头顶部）- 先创建，z-index 较低
      for (let i = 0; i < cols; i++) {
        const cell = tableElement.rows[0]?.cells[i];
        if (!cell) continue;

        const cellRect = cell.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const colHandle = document.createElement('div');
        colHandle.className = 'table-col-handle';
        colHandle.style.left = `${cellRect.left - wrapperRect.left}px`;
        colHandle.style.width = `${cellRect.width}px`;
        colHandle.dataset.colIndex = String(i);

        // 删除列按钮（至少保留一列）
        if (cols > 1) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'table-delete-col-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = '删除列';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            modifyTable((table) => astDeleteColumn(table, i));
          };
          colHandle.appendChild(deleteBtn);
        }

        // 点击操作柄选中列
        colHandle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isSelected = colHandle.classList.contains('selected');

          // 清除所有选中状态
          dividersContainer.querySelectorAll('.table-col-handle.selected').forEach((el) => {
            el.classList.remove('selected');
          });
          dividersContainer.querySelectorAll('.table-row-handle.selected').forEach((el) => {
            el.classList.remove('selected');
          });
          tableElement.querySelectorAll('td, th').forEach((el) => {
            el.classList.remove('selected');
          });

          if (!isSelected) {
            // 选中当前列
            colHandle.classList.add('selected');
            // 高亮列中的所有单元格
            for (let r = 0; r < tableElement.rows.length; r++) {
              const cell = tableElement.rows[r].cells[i];
              if (cell) cell.classList.add('selected');
            }
          }
        });

        dividersContainer.appendChild(colHandle);
      }

      // 在列之间创建分隔线（包括最后一列之后）- 后创建，z-index 较高
      for (let i = 0; i < cols; i++) {
        const cell = tableElement.rows[0]?.cells[i];
        if (!cell) continue;

        const cellRect = cell.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // 计算位置：如果是最后一列，使用单元格右边缘；否则使用下一列的左边缘
        let right: number;
        if (i < cols - 1) {
          const nextCell = tableElement.rows[0]?.cells[i + 1];
          if (!nextCell) continue;
          const nextCellRect = nextCell.getBoundingClientRect();
          right = nextCellRect.left - wrapperRect.left;
        } else {
          // 最后一列，使用单元格右边缘
          right = cellRect.right - wrapperRect.left;
        }

        const colDivider = document.createElement('div');
        colDivider.className = 'table-col-divider';
        colDivider.style.left = `${right - 8}px`;

        // 添加列按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'table-col-add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '插入列';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          // 检查是否有选中的操作柄
          const hasSelectedHandle = dividersContainer.querySelector('.table-col-handle.selected, .table-row-handle.selected');
          if (hasSelectedHandle) return;
          modifyTable((table) => astInsertColumn(table, i + 1));
        };

        colDivider.appendChild(addBtn);
        dividersContainer.appendChild(colDivider);
      }
    };

    // 创建行分隔线
    const createRowDividers = () => {
      const { rows } = getTableDimensions();

      // 创建行操作柄（在每行左侧）- 先创建，z-index 较低
      for (let i = 0; i < rows; i++) {
        const row = tableElement.rows[i];
        if (!row) continue;

        const rowRect = row.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const rowHandle = document.createElement('div');
        rowHandle.className = 'table-row-handle';
        rowHandle.style.top = `${rowRect.top - wrapperRect.top}px`;
        rowHandle.style.height = `${rowRect.height}px`;
        rowHandle.dataset.rowIndex = String(i);

        // 删除行按钮（至少保留一行）
        if (rows > 1) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'table-delete-row-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = '删除行';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            modifyTable((table) => astDeleteRow(table, i));
          };
          rowHandle.appendChild(deleteBtn);
        }

        // 点击操作柄选中行
        rowHandle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isSelected = rowHandle.classList.contains('selected');
          
          // 清除所有选中状态
          dividersContainer.querySelectorAll('.table-col-handle.selected').forEach((el) => {
            el.classList.remove('selected');
          });
          dividersContainer.querySelectorAll('.table-row-handle.selected').forEach((el) => {
            el.classList.remove('selected');
          });
          tableElement.querySelectorAll('td, th').forEach((el) => {
            el.classList.remove('selected');
          });

          if (!isSelected) {
            // 选中当前行
            rowHandle.classList.add('selected');
            // 高亮行中的所有单元格
            for (let c = 0; c < row.cells.length; c++) {
              row.cells[c].classList.add('selected');
            }
          }
        });

        dividersContainer.appendChild(rowHandle);
      }

      // 在行之间创建分隔线（包括最后一行之后）- 后创建，z-index 较高
      for (let i = 0; i < rows; i++) {
        const row = tableElement.rows[i];
        if (!row) continue;

        const rowRect = row.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // 计算位置：如果是最后一行，使用行底部；否则使用下一行的顶部
        let bottom: number;
        if (i < rows - 1) {
          const nextRow = tableElement.rows[i + 1];
          if (!nextRow) continue;
          const nextRowRect = nextRow.getBoundingClientRect();
          bottom = nextRowRect.top - wrapperRect.top;
        } else {
          // 最后一行，使用行底部
          bottom = rowRect.bottom - wrapperRect.top;
        }

        const rowDivider = document.createElement('div');
        rowDivider.className = 'table-row-divider';
        rowDivider.style.top = `${bottom - 8}px`;

        // 添加行按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'table-row-add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '插入行';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          // 检查是否有选中的操作柄
          const hasSelectedHandle = dividersContainer.querySelector('.table-col-handle.selected, .table-row-handle.selected');
          if (hasSelectedHandle) return;
          modifyTable((table) => astInsertRow(table, i + 1));
        };

        rowDivider.appendChild(addBtn);
        dividersContainer.appendChild(rowDivider);
      }
    };

    // 初始化分隔线
    setTimeout(() => {
      createColumnDividers();
      createRowDividers();
    }, 100);

    // 监听窗口大小变化，重新计算位置
    const handleResize = () => {
      createColumnDividers();
      createRowDividers();
    };

    window.addEventListener('resize', handleResize);

    // 点击外部取消选中
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.table-col-handle') && !target.closest('.table-row-handle')) {
        dividersContainer.querySelectorAll('.table-col-handle.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        dividersContainer.querySelectorAll('.table-row-handle.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        tableElement.querySelectorAll('td, th').forEach((el) => {
          el.classList.remove('selected');
        });
      }
    };

    document.addEventListener('click', handleDocumentClick);

    // 清理函数
    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleDocumentClick);
    };

    // 保存清理函数
    (wrapper as any).cleanup = cleanup;
  }, [onChange]);

  // 扫描并增强所有表格
  const scanAndEnhanceTables = useCallback(() => {
    const vditorElement = vditorRef.current;
    if (!vditorElement) return;

    const allTables = vditorElement.querySelectorAll('table');

    allTables.forEach((table, index) => {
      const isEnhanced = table.closest('.enhanced-table-wrapper') !== null;
      if (!isEnhanced) {
        enhanceTable(table as HTMLTableElement, index);
      }
    });
  }, [enhanceTable]);

  useEffect(() => {
    const element = vditorRef.current;
    if (!element) return;

    const timer = setTimeout(() => {
      vditorInstanceRef.current = new Vditor(element, {
        height: '100%',
        mode: 'ir',
        theme: 'classic',
        icon: 'ant',
        cache: {
          enable: false,
        },
        preview: {
          theme: {
            current: 'light',
          },
        },
        toolbarConfig: {
          hide: false,
        },
        input: (value: string) => {
          // 如果是内部更新，跳过
          if (isInternalUpdateRef.current) {
            console.log('[Table] Skipping input callback (internal update in progress)');
            return;
          }
          console.log('[Table] Input callback, value length:', value.length);
          onChange(value);
          setTimeout(scanAndEnhanceTables, 100);
        },
        after: () => {
          if (vditorInstanceRef.current) {
            vditorInstanceRef.current.setValue(content);
          }
          setTimeout(() => {
            scanAndEnhanceTables();
          }, 800);
        },
        keydown: (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSave?.();
            return false;
          }

          return true;
        },
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (vditorInstanceRef.current) {
        vditorInstanceRef.current.destroy();
        vditorInstanceRef.current = null;
      }
    };
  }, [content, onChange, onSave, scanAndEnhanceTables]);

  // 内容变化时更新 Vditor
  useEffect(() => {
    // 如果是内部更新，跳过
    if (isInternalUpdateRef.current) {
      console.log('[Table] Skipping external content update (internal update in progress)');
      return;
    }

    const vditor = vditorInstanceRef.current;
    if (vditor && vditor.getValue() !== content) {
      console.log('[Table] External content update:', JSON.stringify(content).substring(0, 100));
      vditor.setValue(content);
    }
  }, [content]);

  // 使用 MutationObserver 监听 DOM 变化
  useEffect(() => {
    const vditorElement = vditorRef.current;
    if (!vditorElement) return;

    const observer = new MutationObserver((mutations) => {
      const hasTableChanges = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node.nodeName === 'TABLE' || (node as Element).querySelector?.('table')
        )
      );

      if (hasTableChanges) {
        setTimeout(scanAndEnhanceTables, 100);
      }
    });

    observer.observe(vditorElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [scanAndEnhanceTables]);

  return (
    <div ref={vditorRef} style={{ height: '100%', flex: 1, minWidth: 0 }} />
  );
}
