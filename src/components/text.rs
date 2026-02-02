use gpui::{div, prelude::*, Div, rgb, px};
use comrak::nodes::NodeValue;
use comrak::{parse_document, Arena, Options};

pub struct Text {
    text: Vec<String>,
}

impl Text {
    pub fn new(text: Vec<String>) -> Self {
        Self { text }
    }

    pub fn render(&self) -> impl IntoElement {
        let content = self.text.join("\n");

        // The returned nodes are created in the supplied Arena, and are bound by its lifetime.
        let arena = Arena::new();

        // Parse the document into a root `AstNode`
        let root = parse_document(&arena, &content, &Options::default());

        let mut parent_div = div();


        // 使用递归函数按树结构解析 AST
        fn parse_node<'a>(node: &'a comrak::nodes::AstNode<'a>, parent: Div) -> Div {
            let mut current_div = parent;
            
            match node.data.borrow().value {
                NodeValue::Document => {
                    // 文档节点，递归处理子节点
                    for child in node.children() {
                        current_div = parse_node(child, current_div);
                    }
                }
                NodeValue::Paragraph => {
                    // 段落节点，创建段落容器
                    let mut paragraph_div = div().py(px(8.0));
                    for child in node.children() {
                        paragraph_div = parse_node(child, paragraph_div);
                    }
                    current_div = current_div.child(paragraph_div);
                }
                NodeValue::Heading(ref heading) => {
                    // 标题节点，根据级别创建不同大小的标题
                    let level = heading.level;
                    let mut heading_div = match level {
                        1 => div().text_3xl(),
                        2 => div().text_2xl(),
                        3 => div().text_xl(),
                        4 => div().text_lg(),
                        5 => div().text_base(),
                        6 => div().text_sm(),
                        _ => div().text_sm(),
                    };
                    for child in node.children() {
                        heading_div = parse_node(child, heading_div);
                    }
                    current_div = current_div.child(heading_div);
                }
                NodeValue::Text(ref text) => {
                    // 文本节点，直接添加文本内容
                    if current_div.text_style().is_none() {
                        current_div = current_div.text_sm();
                    }
                    current_div = current_div.child(format!("{}", text));
                }
                NodeValue::CodeBlock(ref code_block) => {
                    // 代码块节点
                    let mut code_div = div().bg(rgb(0x2d2d2d)).text_color(rgb(0xe1e1e1)).p(px(16.0)).rounded(px(4.0)).text_sm();
                    for child in node.children() {
                        code_div = parse_node(child, code_div);
                    }
                    current_div = current_div.child(code_div);
                }
                NodeValue::BlockQuote => {
                    // 引用块节点
                    let mut quote_div = div().border_l(px(4.0)).pl(px(16.0)).text_color(rgb(0x9ca3af));
                    for child in node.children() {
                        quote_div = parse_node(child, quote_div);
                    }
                    current_div = current_div.child(quote_div);
                }
                NodeValue::List(ref list) => {
                    // 列表节点
                    let mut list_div = div().pl(px(16.0));
                    for child in node.children() {
                        list_div = parse_node(child, list_div);
                    }
                    current_div = current_div.child(list_div);
                }
                NodeValue::Item(_) => {
                    // 列表项节点
                    let mut item_div = div().pl(px(8.0));
                    for child in node.children() {
                        item_div = parse_node(child, item_div);
                    }
                    current_div = current_div.child(item_div);
                }
                _ => {
                    // 其他节点类型，递归处理子节点
                    for child in node.children() {
                        current_div = parse_node(child, current_div);
                    }
                }
            }
            
            current_div
        }
        
        // 开始解析 AST，跳过根节点本身
        let mut iter = root.children();
        iter.next(); // 跳过根节点
        for child in iter {
            parent_div = parse_node(child, parent_div);
            // println!("{:?}", child.data.borrow().value);
        }
        
        parent_div
    }
}