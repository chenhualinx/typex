import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import type { Root, Table, TableRow, TableCell } from 'mdast';

/**
 * Markdown 表格 AST 处理工具
 * 使用 remark 解析和修改表格
 */

/**
 * 解析 Markdown 内容，返回 AST
 */
export function parseMarkdown(content: string): Root {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(content) as Root;
}

/**
 * 将 AST 转换回 Markdown 字符串
 */
export function stringifyMarkdown(ast: Root): string {
  return unified()
    .use(remarkStringify)
    .use(remarkGfm)
    .stringify(ast);
}

/**
 * 从 AST 中提取所有表格节点
 */
export function findTables(ast: Root): Table[] {
  const tables: Table[] = [];

  function traverse(node: any) {
    if (node.type === 'table') {
      tables.push(node as Table);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(ast);
  return tables;
}

/**
 * 获取表格的表头内容
 */
export function getTableHeaders(table: Table): string[] {
  if (table.children.length === 0) return [];
  const headerRow = table.children[0];
  return headerRow.children.map(cell => getCellText(cell));
}

/**
 * 获取表格的数据行（不包括表头）
 */
export function getTableRows(table: Table): string[][] {
  if (table.children.length <= 1) return [];
  // 从第二行开始是数据行（第一行是表头）
  return table.children.slice(1).map(row =>
    row.children.map(cell => getCellText(cell))
  );
}

/**
 * 获取单元格文本内容
 */
function getCellText(cell: TableCell): string {
  // 将单元格内的所有文本节点合并
  const texts: string[] = [];
  function extractText(node: any) {
    if (node.type === 'text') {
      texts.push(node.value);
    }
    if (node.children) {
      node.children.forEach(extractText);
    }
  }
  cell.children.forEach(extractText);
  return texts.join('').trim();
}

/**
 * 创建文本单元格
 */
function createCell(text: string): TableCell {
  return {
    type: 'tableCell',
    children: text ? [{ type: 'text', value: text }] : [],
  } as TableCell;
}

/**
 * 创建表格行
 */
function createRow(cells: string[]): TableRow {
  return {
    type: 'tableRow',
    children: cells.map(createCell),
  } as TableRow;
}

/**
 * 在指定位置插入行
 */
export function insertRow(table: Table, rowIndex: number, cells?: string[]): Table {
  const headers = getTableHeaders(table);
  const newRow = createRow(cells || new Array(headers.length).fill(''));

  // rowIndex 是相对于数据行的索引，需要加 1（因为第一行是表头）
  const insertIndex = rowIndex + 1;
  table.children.splice(insertIndex, 0, newRow);

  return table;
}

/**
 * 删除指定行
 */
export function deleteRow(table: Table, rowIndex: number): Table {
  // rowIndex 是相对于数据行的索引，需要加 1（因为第一行是表头）
  const deleteIndex = rowIndex + 1;
  if (deleteIndex < table.children.length) {
    table.children.splice(deleteIndex, 1);
  }
  return table;
}

/**
 * 在指定位置插入列
 */
export function insertColumn(table: Table, colIndex: number, headerText?: string): Table {
  // 更新表头
  if (table.children.length > 0) {
    const headerRow = table.children[0];
    const newHeaderCell = createCell(headerText || `列 ${colIndex + 1}`);
    headerRow.children.splice(colIndex, 0, newHeaderCell);
  }

  // 更新所有数据行
  for (let i = 1; i < table.children.length; i++) {
    const row = table.children[i];
    const newCell = createCell('');
    row.children.splice(colIndex, 0, newCell);
  }

  return table;
}

/**
 * 删除指定列
 */
export function deleteColumn(table: Table, colIndex: number): Table {
  // 确保至少保留一列
  const colCount = table.children[0]?.children.length || 0;
  if (colCount <= 1) return table;

  // 从所有行中删除该列
  for (const row of table.children) {
    if (colIndex < row.children.length) {
      row.children.splice(colIndex, 1);
    }
  }

  return table;
}

/**
 * 创建新表格
 */
export function createTable(headers: string[], rows: string[][]): Table {
  const table: Table = {
    type: 'table',
    children: [
      createRow(headers),
      ...rows.map(row => createRow(row)),
    ],
  } as Table;

  return table;
}

/**
 * 将表格转换为 Markdown 字符串
 */
export function tableToMarkdown(table: Table): string {
  const ast: Root = {
    type: 'root',
    children: [table],
  } as Root;
  return stringifyMarkdown(ast);
}

/**
 * 更新 AST 中的指定表格
 */
export function updateTableInAst(ast: Root, tableIndex: number, newTable: Table): Root {
  const tables = findTables(ast);
  if (tableIndex >= 0 && tableIndex < tables.length) {
    const oldTable = tables[tableIndex];
    // 替换旧表格
    function replaceTable(node: any): any {
      if (node === oldTable) {
        return newTable;
      }
      if (node.children) {
        node.children = node.children.map(replaceTable);
      }
      return node;
    }
    return replaceTable(ast) as Root;
  }
  return ast;
}
