import { useEffect, useRef, useState, useCallback } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { SlashToolbar } from './SlashToolbar';
import './EnhancedTable.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export function MarkdownEditor({ content, onChange, onSave }: MarkdownEditorProps) {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstanceRef = useRef<Vditor | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const slashRangeRef = useRef<Range | null>(null);

  const [showSlashToolbar, setShowSlashToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  // 获取光标位置
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { x: 0, y: 0 };

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    return {
      x: rect.left,
      y: rect.bottom + 8,
    };
  }, []);

  // 删除 '/' 字符
  const removeSlash = useCallback(() => {
    if (!slashRangeRef.current) return;

    try {
      const range = slashRangeRef.current;
      const textNode = range.startContainer;
      const offset = range.startOffset;

      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        // 删除 '/' 字符
        const newText = text.substring(0, offset - 1) + text.substring(offset);
        textNode.textContent = newText;

        // 恢复光标位置
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStart(textNode, offset - 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } catch (e) {
      console.error('Error removing slash:', e);
    }

    slashRangeRef.current = null;
  }, []);

  // 插入表格
  const insertTable = useCallback((rows: number, cols: number) => {
    console.log('[MarkdownEditor] insertTable called with', rows, 'rows,', cols, 'cols');
    const vditor = vditorInstanceRef.current;
    if (!vditor) {
      console.log('[MarkdownEditor] vditor instance not found');
      return;
    }

    // 删除 '/' 字符（可选，失败不阻断）
    try {
      removeSlash();
    } catch (e) {
      console.log('[MarkdownEditor] removeSlash failed, continuing...');
    }

    // 生成表格 Markdown
    let tableMarkdown = '\n';
    // 表头
    const headers = Array(cols).fill(' 列 ');
    tableMarkdown += '|' + headers.join('|') + '|\n';
    // 分隔符
    const separators = Array(cols).fill(' --- ');
    tableMarkdown += '|' + separators.join('|') + '|\n';
    // 数据行
    for (let i = 0; i < rows - 1; i++) {
      const cells = Array(cols).fill('     ');
      tableMarkdown += '|' + cells.join('|') + '|\n';
    }
    tableMarkdown += '\n';

    console.log('[MarkdownEditor] Inserting markdown:', tableMarkdown);

    // 获取当前内容并在光标位置插入表格
    const currentValue = vditor.getValue();
    const newValue = currentValue + tableMarkdown;
    vditor.setValue(newValue);
    console.log('[MarkdownEditor] Table inserted via setValue');

    // 触发内容变化回调
    console.log('[MarkdownEditor] New content length:', newValue.length);
    console.log('[MarkdownEditor] New content:', JSON.stringify(newValue));
    onChange(newValue);
  }, [removeSlash, onChange]);

  // 处理 '/' 快捷键
  const handleSlashKey = useCallback((event: KeyboardEvent) => {
    if (event.key === '/') {
      // 保存当前选区，用于后续删除 '/'
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        slashRangeRef.current = range;
      }

      const position = getCursorPosition();
      setToolbarPosition(position);
      setShowSlashToolbar(true);
      return false;
    }
    return true;
  }, [getCursorPosition]);

  // 处理工具栏关闭
  const handleToolbarClose = useCallback(() => {
    setShowSlashToolbar(false);
    // 如果关闭时没有选择操作，需要删除 '/'
    removeSlash();
  }, [removeSlash]);

  // 处理插入表格
  const handleInsertTable = useCallback((rows: number, cols: number) => {
    console.log('[MarkdownEditor] handleInsertTable called with', rows, 'cols', cols);
    setShowSlashToolbar(false);
    console.log('[MarkdownEditor] Calling insertTable...');
    insertTable(rows, cols);
    console.log('[MarkdownEditor] insertTable returned');
  }, [insertTable]);

  // 解析 Markdown 表格
  const parseMarkdownTable = (markdown: string): { headers: string[]; rows: string[][] } | null => {
    const lines = markdown.trim().split('\n');
    if (lines.length < 2) return null;

    // 解析表头
    const headerLine = lines[0].trim();
    const headers = headerLine
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(h => h.trim());

    // 跳过分隔符行
    const dataRows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || !line.startsWith('|')) continue;

      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
      dataRows.push(cells);
    }

    return { headers, rows: dataRows };
  };

  // 将表格数据转换为 Markdown
  const tableDataToMarkdown = (headers: string[], rows: string[][]): string => {
    let markdown = '\n';

    // 表头
    markdown += '|' + headers.map(h => ` ${h} `).join('|') + '|\n';

    // 分隔符
    markdown += '|' + headers.map(() => ' --- ').join('|') + '|\n';

    // 数据行
    rows.forEach(row => {
      markdown += '|' + row.map(cell => ` ${cell} `).join('|') + '|\n';
    });
    markdown += '\n';
    return markdown;
  };

  // 为表格添加增强功能
  const enhanceTable = useCallback((tableElement: HTMLTableElement) => {
    if (tableElement.dataset.enhanced === 'true') return;
    tableElement.dataset.enhanced = 'true';

    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'enhanced-table-wrapper';

    // 将表格包装起来
    if (tableElement.parentElement) {
      tableElement.parentElement.insertBefore(wrapper, tableElement);
      wrapper.appendChild(tableElement);
    }

    // 创建分隔线容器
    const dividersContainer = document.createElement('div');
    dividersContainer.className = 'table-dividers-container';
    wrapper.appendChild(dividersContainer);

    // 从 DOM 表格提取数据
    const extractTableDataFromDOM = (): { headers: string[]; rows: string[][] } | null => {
      const headers: string[] = [];
      const rows: string[][] = [];

      console.log('[Table] extractTableDataFromDOM: table has', tableElement.rows.length, 'rows');

      // 提取表头（第一行）
      const headerRow = tableElement.rows[0];
      if (!headerRow) return null;

      for (let i = 0; i < headerRow.cells.length; i++) {
        headers.push(headerRow.cells[i].textContent?.trim() || '');
      }
      console.log('[Table] extractTableDataFromDOM: headers =', headers);

      // 提取数据行（从第二行开始，跳过表头和分隔符行）
      // Vditor 渲染的表格：第1行是表头，第2行是分隔符（通常是 th 或带有特定样式的行），第3行开始是数据
      for (let i = 1; i < tableElement.rows.length; i++) {
        const row = tableElement.rows[i];

        // 获取该行的所有单元格文本
        const cellTexts = Array.from(row.cells).map(cell => cell.textContent?.trim() || '');
        console.log('[Table] extractTableDataFromDOM: row', i, 'cells =', cellTexts);

        // 跳过分隔符行（通常是所有单元格都是 --- 或者只包含横线）
        // 注意：不能简单地把空单元格行当作分隔符，因为数据行也可能是空的
        const isDividerRow = cellTexts.every(text => {
          // 分隔符行必须包含至少一个 ---
          return text === '---' || /^-+$/.test(text);
        }) && cellTexts.some(text => text === '---' || /^-+$/.test(text));

        if (isDividerRow) {
          console.log('[Table] extractTableDataFromDOM: skipping divider row', i);
          continue;
        }

        rows.push(cellTexts);
      }

      console.log('[Table] extractTableDataFromDOM: extracted', rows.length, 'data rows');
      return { headers, rows };
    };

    // 获取当前表格在 Markdown 中的位置和内容
    const getTableInfo = () => {
      const vditor = vditorInstanceRef.current;
      if (!vditor) {
        console.log('[Table] getTableInfo: vditor not found');
        return null;
      }

      const content = vditor.getValue();
      console.log('[Table] getTableInfo: content length', content.length);
      
      // 匹配 Markdown 表格
      const tableRegex = /\n\|[^\n]+\|\n\|[-\s:|]+\|\n(?:\|[^\n]+\|\n?)+/g;
      const matches = Array.from(content.matchAll(tableRegex));
      console.log('[Table] getTableInfo: found', matches.length, 'tables in markdown');
      
      // 找到与当前 DOM 表格对应的 Markdown 表格
      // 这里我们使用表格内容来匹配
      const firstCell = tableElement.rows[0]?.cells[0]?.textContent?.trim() || '';
      console.log('[Table] getTableInfo: first cell content', JSON.stringify(firstCell));
      
      for (const match of matches) {
        const tableData = parseMarkdownTable(match[0]);
        console.log('[Table] getTableInfo: checking match, header[0]=', tableData?.headers[0]);
        if (tableData && tableData.headers[0] === firstCell) {
          console.log('[Table] getTableInfo: found matching table');
          return {
            match: match[0],
            index: match.index || 0,
            data: tableData
          };
        }
      }
      
      // 如果找不到匹配的 Markdown 表格，但从 DOM 可以提取到数据，
      // 则使用 DOM 数据（这种情况发生在表格已渲染但 Markdown 未同步时）
      const domTableData = extractTableDataFromDOM();
      if (domTableData) {
        console.log('[Table] getTableInfo: using DOM table data');
        // 生成 Markdown 并替换内容（因为旧内容中没有正确的表格）
        const tableMarkdown = tableDataToMarkdown(domTableData.headers, domTableData.rows);
        // 清空旧内容，只保留表格
        vditor.setValue(tableMarkdown);
        onChange(tableMarkdown);
        
        return {
          match: tableMarkdown,
          index: 0,
          data: domTableData
        };
      }
      
      console.log('[Table] getTableInfo: no tables found');
      return null;
    };

    // 更新 Markdown 内容
    const updateMarkdown = (headers: string[], rows: string[][]) => {
      console.log('[Table] updateMarkdown called');
      const vditor = vditorInstanceRef.current;
      if (!vditor) {
        console.log('[Table] vditor not found');
        return;
      }

      // 直接生成新的 Markdown 表格并替换整个内容
      const newTableMarkdown = tableDataToMarkdown(headers, rows);
      console.log('[Table] New markdown:', newTableMarkdown.substring(0, 100));
      
      console.log('[Table] Setting new content, length:', newTableMarkdown.length);
      // 更新内容 - 直接替换为新的表格
      vditor.setValue(newTableMarkdown);
      onChange(newTableMarkdown);
      
      // 重新扫描并增强表格
      setTimeout(() => {
        scanAndEnhanceTables();
      }, 100);
    };

    // 插入行
    const insertRow = (rowIndex: number) => {
      console.log('[Table] insertRow called with index', rowIndex);
      
      // 检查 Vditor 内容
      const vditor = vditorInstanceRef.current;
      if (vditor) {
        const currentValue = vditor.getValue();
        console.log('[Table] Current Vditor value length:', currentValue.length);
        console.log('[Table] Current Vditor value:', JSON.stringify(currentValue));
      } else {
        console.log('[Table] vditor instance is null');
      }
      
      const tableInfo = getTableInfo();
      if (!tableInfo) {
        console.log('[Table] getTableInfo returned null');
        return;
      }

      const { headers, rows } = tableInfo.data;
      console.log('[Table] Current headers:', headers, 'rows:', rows.length);
      const newRow = new Array(headers.length).fill('');
      rows.splice(rowIndex, 0, newRow);
      console.log('[Table] New rows count:', rows.length);
      
      updateMarkdown(headers, rows);
    };

    // 插入列
    const insertColumn = (colIndex: number) => {
      console.log('[Table] insertColumn called with index', colIndex);
      
      // 检查 Vditor 内容
      const vditor = vditorInstanceRef.current;
      if (vditor) {
        const currentValue = vditor.getValue();
        console.log('[Table] Current Vditor value length:', currentValue.length);
        console.log('[Table] Current Vditor value:', JSON.stringify(currentValue));
      } else {
        console.log('[Table] vditor instance is null');
      }
      
      const tableInfo = getTableInfo();
      if (!tableInfo) {
        console.log('[Table] getTableInfo returned null in insertColumn');
        return;
      }

      const { headers, rows } = tableInfo.data;
      console.log('[Table] Current headers:', headers, 'rows:', rows.length);
      
      // 在表头插入
      headers.splice(colIndex, 0, `列 ${colIndex + 1}`);
      
      // 在每行插入
      rows.forEach(row => {
        row.splice(colIndex, 0, '');
      });
      
      console.log('[Table] New headers:', headers);
      updateMarkdown(headers, rows);
    };

    // 删除行
    const deleteRow = (rowIndex: number) => {
      const tableInfo = getTableInfo();
      if (!tableInfo) return;

      const { headers, rows } = tableInfo.data;
      if (rows.length > 1) {
        rows.splice(rowIndex, 1);
        updateMarkdown(headers, rows);
      }
    };

    // 删除列
    const deleteColumn = (colIndex: number) => {
      const tableInfo = getTableInfo();
      if (!tableInfo) return;

      const { headers, rows } = tableInfo.data;
      if (headers.length > 1) {
        headers.splice(colIndex, 1);
        rows.forEach(row => {
          row.splice(colIndex, 1);
        });
        updateMarkdown(headers, rows);
      }
    };

    // 渲染分隔线和按钮
    const renderDividers = () => {
      dividersContainer.innerHTML = '';

      const wrapperRect = wrapper.getBoundingClientRect();

      // 渲染列分隔线（在每列的右侧）
      const colCount = tableElement.rows[0]?.cells.length || 0;
      for (let i = 0; i < colCount; i++) {
        const cell = tableElement.rows[0]?.cells[i];
        if (!cell) continue;

        const cellRect = cell.getBoundingClientRect();
        const right = cellRect.right - wrapperRect.left;

        // 列分隔线容器
        const colDivider = document.createElement('div');
        colDivider.className = 'table-col-divider';
        colDivider.style.left = `${right - 8}px`;

        // 列加号按钮（先添加，显示在上方）
        const addBtn = document.createElement('button');
        addBtn.className = 'table-col-add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '插入列';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          console.log('[Table] Insert column clicked at index', i + 1);
          insertColumn(i + 1);
        };
        colDivider.appendChild(addBtn);

        // 列删除按钮（后添加，显示在下方，只在有多个列时显示）
        if (colCount > 1) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'table-delete-col-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = '删除列';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            console.log('[Table] Delete column clicked at index', i);
            deleteColumn(i);
          };
          colDivider.appendChild(deleteBtn);
        }

        dividersContainer.appendChild(colDivider);
      }

      // 渲染行分隔线（在每行的下方）
      const rowCount = tableElement.rows.length;
      for (let i = 0; i < rowCount; i++) {
        const row = tableElement.rows[i];
        const rowRect = row.getBoundingClientRect();
        const bottom = rowRect.bottom - wrapperRect.top;

        // 行分隔线容器
        const rowDivider = document.createElement('div');
        rowDivider.className = 'table-row-divider';
        rowDivider.style.top = `${bottom - 8}px`;

        // 行加号按钮（先添加，显示在左侧）
        const addBtn = document.createElement('button');
        addBtn.className = 'table-row-add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '插入行';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          console.log('[Table] Insert row clicked at index', i + 1);
          insertRow(i + 1);
        };
        rowDivider.appendChild(addBtn);

        // 行删除按钮（后添加，显示在右侧，只在有多个行时显示）
        if (rowCount > 1) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'table-delete-row-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = '删除行';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            console.log('[Table] Delete row clicked at index', i);
            deleteRow(i);
          };
          rowDivider.appendChild(deleteBtn);
        }

        dividersContainer.appendChild(rowDivider);
      }
    };

    // 初始渲染
    renderDividers();

    // 窗口大小变化时重新计算位置
    const handleResize = () => {
      renderDividers();
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    (tableElement as any)._cleanup = () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onChange]);

  // 扫描并增强所有表格
  const scanAndEnhanceTables = useCallback(() => {
    const vditorElement = vditorRef.current;
    if (!vditorElement) {
      console.log('[Table] vditorElement not found');
      return;
    }

    // 获取当前 Vditor 的内容
    const vditor = vditorInstanceRef.current;
    if (vditor) {
      const currentValue = vditor.getValue();
      console.log('[Table] Current Vditor value:', JSON.stringify(currentValue));
    }

    // 在整个 vditor 元素内查找所有表格（包括预览区域和编辑区域）
    const allTables = vditorElement.querySelectorAll('table');
    console.log('[Table] Total tables found in vditor:', allTables.length);
    
    if (allTables.length === 0) {
      // 如果没有找到表格，输出 DOM 结构帮助调试
      console.log('[Table] VDitor HTML structure:', vditorElement.innerHTML.substring(0, 500));
    }
    
    // 检查每个表格是否已经被增强（通过检查父元素是否有 enhanced-table-wrapper）
    allTables.forEach((table, index) => {
      const isEnhanced = table.closest('.enhanced-table-wrapper') !== null;
      console.log(`[Table] Table ${index}: enhanced=${isEnhanced}`);
      
      if (!isEnhanced) {
        console.log('[Table] Enhancing table', index);
        enhanceTable(table as HTMLTableElement);
      }
    });
  }, [enhanceTable]);

  useEffect(() => {
    const element = vditorRef.current;
    if (!element) return;

    // 延迟初始化，确保 DOM 已准备好
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
          hide: true,
        },
        input: (value: string) => {
          onChange(value);
          // 输入后扫描新表格
          setTimeout(scanAndEnhanceTables, 100);
        },
        after: () => {
          console.log('[Table] Vditor initialized');
          if (vditorInstanceRef.current) {
            vditorInstanceRef.current.setValue(content);
          }
          // 初始化后扫描表格，延迟足够时间确保 DOM 已渲染
          setTimeout(() => {
            console.log('[Table] Scanning tables after init');
            scanAndEnhanceTables();
          }, 800);
        },
        // 添加快捷键支持
        keydown: (event: KeyboardEvent) => {
          // '/' 键触发工具栏
          if (event.key === '/' && !showSlashToolbar) {
            return handleSlashKey(event);
          }

          // Ctrl+S 或 Cmd+S 保存
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSave?.();
            return false;
          }
        },
      });
    }, 0);

    // 处理窗口大小变化
    const handleResize = () => {
      // 使用防抖避免频繁触发
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        try {
          const vditor = vditorInstanceRef.current;
          if (vditor && (vditor as any).vditor && (vditor as any).vditor.element) {
            // 触发 Vditor 重新计算布局
            const currentValue = vditor.getValue();
            vditor.setValue(currentValue);
          }
        } catch (e) {
          // 忽略错误
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      try {
        vditorInstanceRef.current?.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      vditorInstanceRef.current = null;
    };
  }, []);

  // 当内容变化时重新扫描表格
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Table] Content changed, scanning...');
      scanAndEnhanceTables();
    }, 300);
    return () => clearTimeout(timer);
  }, [content, scanAndEnhanceTables]);

  // 使用 MutationObserver 监听 DOM 变化
  useEffect(() => {
    const vditorElement = vditorRef.current;
    if (!vditorElement) return;

    const observer = new MutationObserver((mutations) => {
      // 检查是否有表格被添加
      const hasTableAdded = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node instanceof HTMLElement) {
            return node.tagName === 'TABLE' || node.querySelector('table');
          }
          return false;
        });
      });

      if (hasTableAdded) {
        console.log('[Table] Table added to DOM, scanning...');
        scanAndEnhanceTables();
      }
    });

    observer.observe(vditorElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [scanAndEnhanceTables]);

  return (
    <>
      <div ref={vditorRef} style={{ height: '100%', flex: 1, minWidth: 0 }} />
      <SlashToolbar
        isOpen={showSlashToolbar}
        position={toolbarPosition}
        onClose={handleToolbarClose}
        onInsertTable={handleInsertTable}
      />
    </>
  );
}
