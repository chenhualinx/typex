use std::ops::Range;

use gpui::{
    App, Application, Bounds, ClipboardItem, Context, CursorStyle, ElementId, ElementInputHandler,
    Entity, EntityInputHandler, FocusHandle, Focusable, GlobalElementId, KeyBinding, Keystroke,
    LayoutId, MouseButton, MouseDownEvent, MouseMoveEvent, MouseUpEvent, PaintQuad, Pixels, Point,
    ScrollHandle, ShapedLine, SharedString, Style, TextRun, UTF16Selection, UnderlineStyle,
    Window, WindowBounds, WindowOptions, actions, black, div, fill, hsla, opaque_grey, point,
    prelude::*, px, relative, rgb, rgba, size, white, yellow,
};
use unicode_segmentation::*;

actions!(
    text_input,
    [
        Backspace,
        Delete,
        Left,
        Right,
        SelectLeft,
        SelectRight,
        SelectAll,
        Home,
        End,
        ShowCharacterPalette,
        Paste,
        Cut,
        Copy,
        Quit,
        Up,
        Down,
        Enter,
        PageUp,
        PageDown,
    ]
);

struct TextInput {
    focus_handle: FocusHandle,
    content: SharedString,
    placeholder: SharedString,
    selected_range: Range<usize>,
    selection_reversed: bool,
    marked_range: Option<Range<usize>>,
    last_layout: Option<Vec<ShapedLine>>,
    last_bounds: Option<Bounds<Pixels>>,
    is_selecting: bool,
    line_height: Pixels,
    scroll_handle: ScrollHandle,
}

impl TextInput {
    fn left(&mut self, _: &Left, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.previous_boundary(self.cursor_offset()), cx);
        } else {
            self.move_to(self.selected_range.start, cx)
        }
    }

    fn right(&mut self, _: &Right, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.next_boundary(self.selected_range.end), cx);
        } else {
            self.move_to(self.selected_range.end, cx)
        }
    }

    fn select_left(&mut self, _: &SelectLeft, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.previous_boundary(self.cursor_offset()), cx);
    }

    fn select_right(&mut self, _: &SelectRight, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.next_boundary(self.cursor_offset()), cx);
    }

    fn select_all(&mut self, _: &SelectAll, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(0, cx);
        self.select_to(self.content.len(), cx)
    }

    fn home(&mut self, _: &Home, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(0, cx);
    }

    fn end(&mut self, _: &End, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(self.content.len(), cx);
    }

    fn up(&mut self, _: &Up, _: &mut Window, cx: &mut Context<Self>) {
        println!("Up key pressed!");
        println!("Current content: {:?}", self.content);
        let lines: Vec<&str> = self.content.split_inclusive('\n').collect();
        println!("Lines: {:?}", lines);
        let mut current_offset = 0;
        let cursor = self.cursor_offset();
        println!("Current cursor: {}", cursor);
        
        for (i, line) in lines.iter().enumerate() {
            println!("Checking line {}: {:?}, current_offset: {}, line.len(): {}", i, line, current_offset, line.len());
            if current_offset + line.len() > cursor {
                println!("Found current line: {}", i);
                // 找到当前行，移动到上一行
                if i > 0 {
                    let prev_line = lines[i-1];
                    let prev_line_start = current_offset - prev_line.len();
                    // 计算上一行的长度（减去换行符）
                    let prev_line_content_len = if prev_line.ends_with('\n') {
                        prev_line.len() - 1
                    } else {
                        prev_line.len()
                    };
                    // 计算当前行内的光标偏移量
                    let current_line_offset = cursor - current_offset;
                    // 移动到上一行的相同位置或行尾
                    let new_offset = prev_line_start + std::cmp::min(current_line_offset, prev_line_content_len);
                    println!("Moving to prev line {} at offset: {}", i-1, new_offset);
                    self.move_to(new_offset, cx);
                } else {
                    println!("Already at first line");
                }
                return;
            }
            current_offset += line.len();
        }
        
        // 如果光标在最后一行，尝试移动到上一行
        if !lines.is_empty() && cursor == self.content.len() {
            println!("Cursor at end of content, trying to move up");
            let last_line_idx = lines.len() - 1;
            if last_line_idx > 0 {
                let prev_line = lines[last_line_idx - 1];
                let prev_line_start = self.content.len() - lines[last_line_idx].len() - prev_line.len();
                // 计算上一行的长度（减去换行符）
                let prev_line_content_len = if prev_line.ends_with('\n') {
                    prev_line.len() - 1
                } else {
                    prev_line.len()
                };
                // 移动到上一行的末尾
                let new_offset = prev_line_start + prev_line_content_len;
                println!("Moving to prev line {} at offset: {}", last_line_idx - 1, new_offset);
                self.move_to(new_offset, cx);
            } else {
                println!("Already at first line");
            }
        }
    }

    fn down(&mut self, _: &Down, _: &mut Window, cx: &mut Context<Self>) {
        println!("Down key pressed!");
        println!("Current content: {:?}", self.content);
        let lines: Vec<&str> = self.content.split_inclusive('\n').collect();
        println!("Lines: {:?}", lines);
        let mut current_offset = 0;
        let cursor = self.cursor_offset();
        println!("Current cursor: {}", cursor);
        
        for (i, line) in lines.iter().enumerate() {
            println!("Checking line {}: {:?}, current_offset: {}, line.len(): {}", i, line, current_offset, line.len());
            if current_offset + line.len() > cursor {
                println!("Found current line: {}", i);
                // 找到当前行，移动到下一行
                if i < lines.len() - 1 {
                    let next_line = lines[i+1];
                    let next_line_start = current_offset + line.len();
                    // 计算下一行的长度（减去换行符）
                    let next_line_content_len = if next_line.ends_with('\n') {
                        next_line.len() - 1
                    } else {
                        next_line.len()
                    };
                    // 计算当前行内的光标偏移量
                    let current_line_offset = cursor - current_offset;
                    // 移动到下一行的相同位置或行尾
                    let new_offset = next_line_start + std::cmp::min(current_line_offset, next_line_content_len);
                    println!("Moving to next line {} at offset: {}", i+1, new_offset);
                    self.move_to(new_offset, cx);
                } else {
                    println!("Already at last line");
                }
                return;
            }
            current_offset += line.len();
        }
        
        // 如果光标在最后一行，尝试移动到下一行（如果有）
        if !lines.is_empty() && cursor == self.content.len() {
            println!("Cursor at end of content, already at last line");
        }
    }

    fn enter(&mut self, _: &Enter, window: &mut Window, cx: &mut Context<Self>) {
        println!("Enter key pressed!");
        println!("Current content: {:?}", self.content);
        println!("Current cursor: {}", self.cursor_offset());
        println!("Current selected_range: {:?}", self.selected_range);
        println!("Current marked_range: {:?}", self.marked_range);
        
        // 插入换行符
        self.replace_text_in_range(None, "\n", window, cx);
        
        println!("After enter - content: {:?}", self.content);
        println!("After enter - cursor: {}", self.cursor_offset());
        println!("After enter - selected_range: {:?}", self.selected_range);
    }

    fn backspace(&mut self, _: &Backspace, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.previous_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn delete(&mut self, _: &Delete, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.next_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn on_mouse_down(
        &mut self,
        event: &MouseDownEvent,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        println!("Mouse down event!");
        println!("Event position: {:?}", event.position);
        println!("Event modifiers: {:?}", event.modifiers);
        println!("Current content: {:?}", self.content);
        println!("Current cursor: {}", self.cursor_offset());
        println!("Current selected_range: {:?}", self.selected_range);
        
        self.is_selecting = true;
        
        let index = self.index_for_mouse_position(event.position);
        println!("Calculated index for mouse position: {}", index);
        
        if event.modifiers.shift {
            println!("Shift key pressed, selecting to index: {}", index);
            self.select_to(index, cx);
        } else {
            println!("Normal click, moving to index: {}", index);
            self.move_to(index, cx);
        }
        
        println!("After move - cursor: {}, selected_range: {:?}", self.cursor_offset(), self.selected_range);
    }

    fn on_mouse_up(&mut self, _: &MouseUpEvent, _window: &mut Window, _: &mut Context<Self>) {
        self.is_selecting = false;
    }

    fn on_mouse_move(&mut self, event: &MouseMoveEvent, _: &mut Window, cx: &mut Context<Self>) {
        if self.is_selecting {
            self.select_to(self.index_for_mouse_position(event.position), cx);
        }
    }

    fn show_character_palette(
        &mut self,
        _: &ShowCharacterPalette,
        window: &mut Window,
        _: &mut Context<Self>,
    ) {
        window.show_character_palette();
    }

    fn paste(&mut self, _: &Paste, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) {
            self.replace_text_in_range(None, &text, window, cx);
        }
    }

    fn copy(&mut self, _: &Copy, _: &mut Window, cx: &mut Context<Self>) {
        if !self.selected_range.is_empty() {
            cx.write_to_clipboard(ClipboardItem::new_string(
                self.content[self.selected_range.clone()].to_string(),
            ));
        }
    }
    fn cut(&mut self, _: &Cut, window: &mut Window, cx: &mut Context<Self>) {
        if !self.selected_range.is_empty() {
            cx.write_to_clipboard(ClipboardItem::new_string(
                self.content[self.selected_range.clone()].to_string(),
            ));
            self.replace_text_in_range(None, "", window, cx)
        }
    }

    fn move_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        self.selected_range = offset..offset;
        cx.notify()
    }

    fn cursor_offset(&self) -> usize {
        if self.selection_reversed {
            self.selected_range.start
        } else {
            self.selected_range.end
        }
    }

    fn index_for_mouse_position(&self, position: Point<Pixels>) -> usize {
        println!("index_for_mouse_position called with position: {:?}", position);
        println!("Content: {:?}", self.content);
        
        if self.content.is_empty() {
            println!("Content is empty, returning 0");
            return 0;
        }

        let (Some(bounds), Some(layouts)) = (self.last_bounds.as_ref(), self.last_layout.as_ref()) else {
            println!("Bounds or layouts not available, returning 0");
            return 0;
        };
        
        println!("Bounds: {:?}", bounds);
        println!("Layouts count: {}", layouts.len());
        
        if position.y < bounds.top() {
            println!("Position y is above bounds, returning 0");
            return 0;
        }
        if position.y > bounds.bottom() {
            println!("Position y is below bounds, returning content length: {}", self.content.len());
            return self.content.len();
        }
        
        // 计算点击位置所在的行
        let line_height = self.line_height;
        let line_index = ((position.y - bounds.top()) / line_height) as usize;
        println!("Line height: {}, line_index: {}", line_height, line_index);
        
        if line_index >= layouts.len() {
            println!("Line index out of bounds, returning content length: {}", self.content.len());
            return self.content.len();
        }
        
        // 获取该行的布局信息
        let shaped_line = &layouts[line_index];
        println!("Shaped line text: {:?}", shaped_line.text);
        
        // 计算该行的起始偏移量
        let lines: Vec<&str> = self.content.split_inclusive('\n').collect();
        let line_start: usize = lines.iter().take(line_index).map(|line| line.len()).sum();
        println!("Lines: {:?}", lines);
        println!("Line start offset: {}", line_start);
        
        // 计算该行内的字符索引
        let local_x = position.x - bounds.left();
        let local_index = shaped_line.closest_index_for_x(local_x);
        println!("Local x: {}, local_index: {}", local_x, local_index);
        
        // 确保local_index不超过行长度
        let safe_local_index = std::cmp::min(local_index, shaped_line.text.len());
        println!("Safe local index: {}", safe_local_index);
        
        let result = line_start + safe_local_index;
        println!("Final result: {}", result);
        result
    }

    fn select_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        if self.selection_reversed {
            self.selected_range.start = offset
        } else {
            self.selected_range.end = offset
        };
        if self.selected_range.end < self.selected_range.start {
            self.selection_reversed = !self.selection_reversed;
            self.selected_range = self.selected_range.end..self.selected_range.start;
        }
        cx.notify()
    }

    fn offset_from_utf16(&self, offset: usize) -> usize {
        let mut utf8_offset = 0;
        let mut utf16_count = 0;

        for ch in self.content.chars() {
            if utf16_count >= offset {
                break;
            }
            utf16_count += ch.len_utf16();
            utf8_offset += ch.len_utf8();
        }

        utf8_offset
    }

    fn offset_to_utf16(&self, offset: usize) -> usize {
        let mut utf16_offset = 0;
        let mut utf8_count = 0;

        for ch in self.content.chars() {
            if utf8_count >= offset {
                break;
            }
            utf8_count += ch.len_utf8();
            utf16_offset += ch.len_utf16();
        }

        utf16_offset
    }

    fn range_to_utf16(&self, range: &Range<usize>) -> Range<usize> {
        self.offset_to_utf16(range.start)..self.offset_to_utf16(range.end)
    }

    fn range_from_utf16(&self, range_utf16: &Range<usize>) -> Range<usize> {
        self.offset_from_utf16(range_utf16.start)..self.offset_from_utf16(range_utf16.end)
    }

    fn previous_boundary(&self, offset: usize) -> usize {
        self.content
            .grapheme_indices(true)
            .rev()
            .find_map(|(idx, _)| (idx < offset).then_some(idx))
            .unwrap_or(0)
    }

    fn next_boundary(&self, offset: usize) -> usize {
        self.content
            .grapheme_indices(true)
            .find_map(|(idx, _)| (idx > offset).then_some(idx))
            .unwrap_or(self.content.len())
    }

    fn reset(&mut self) {
        self.content = "".into();
        self.selected_range = 0..0;
        self.selection_reversed = false;
        self.marked_range = None;
        self.last_layout = None;
        self.last_bounds = None;
        self.is_selecting = false;
        self.line_height = px(20.);
    }
}

impl EntityInputHandler for TextInput {
    fn text_for_range(
        &mut self,
        range_utf16: Range<usize>,
        actual_range: &mut Option<Range<usize>>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<String> {
        let range = self.range_from_utf16(&range_utf16);
        actual_range.replace(self.range_to_utf16(&range));
        Some(self.content[range].to_string())
    }

    fn selected_text_range(
        &mut self,
        _ignore_disabled_input: bool,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<UTF16Selection> {
        Some(UTF16Selection {
            range: self.range_to_utf16(&self.selected_range),
            reversed: self.selection_reversed,
        })
    }

    fn marked_text_range(
        &self,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Range<usize>> {
        self.marked_range
            .as_ref()
            .map(|range| self.range_to_utf16(range))
    }

    fn unmark_text(&mut self, _window: &mut Window, _cx: &mut Context<Self>) {
        self.marked_range = None;
    }

    fn replace_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        _: &mut Window,
        cx: &mut Context<Self>,
    ) {
        println!("replace_text_in_range called!");
        println!("range_utf16: {:?}", range_utf16);
        println!("new_text: {:?}", new_text);
        println!("Current content: {:?}", self.content);
        println!("Current selected_range: {:?}", self.selected_range);
        println!("Current marked_range: {:?}", self.marked_range);
        
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());
        
        println!("Calculated range: {:?}", range);
        println!("Replacing text from {} to {} with {:?}", range.start, range.end, new_text);
        
        let content_len = self.content.len();
        let end = std::cmp::min(range.end, content_len);
        let start = std::cmp::min(range.start, end);
        
        self.content =
            (self.content[0..start].to_owned() + new_text + &self.content[end..])
                .into();
        
        println!("New content: {:?}", self.content);
        
        self.selected_range = start + new_text.len()..start + new_text.len();
        println!("New selected_range: {:?}", self.selected_range);
        
        self.marked_range.take();
        println!("Cleared marked_range");
        
        cx.notify();
        println!("Notified update");
    }

    fn replace_and_mark_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        new_selected_range_utf16: Option<Range<usize>>,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());

        self.content =
            (self.content[0..range.start].to_owned() + new_text + &self.content[range.end..])
                .into();
        if !new_text.is_empty() {
            self.marked_range = Some(range.start..range.start + new_text.len());
        } else {
            self.marked_range = None;
        }
        self.selected_range = new_selected_range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .map(|new_range| new_range.start + range.start..new_range.end + range.end)
            .unwrap_or_else(|| range.start + new_text.len()..range.start + new_text.len());

        cx.notify();
    }

    fn bounds_for_range(
        &mut self,
        range_utf16: Range<usize>,
        bounds: Bounds<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Bounds<Pixels>> {
        let last_layout = self.last_layout.as_ref()?;
        let range = self.range_from_utf16(&range_utf16);
        
        // 计算文本的行信息
        let lines: Vec<&str> = self.content.split_inclusive('\n').collect();
        let mut line_offsets = Vec::new();
        let mut current_offset = 0;
        
        for line in &lines {
            line_offsets.push(current_offset);
            current_offset += line.len();
        }
        line_offsets.push(current_offset);
        
        // 找到范围所在的行
        let start_line = line_offsets.iter().position(|&offset| offset > range.start).unwrap_or(line_offsets.len()) - 1;
        let end_line = line_offsets.iter().position(|&offset| offset > range.end).unwrap_or(line_offsets.len()) - 1;
        
        if start_line == end_line {
            // 单行范围
            let shaped_line = last_layout.get(start_line)?;
            let line_start = line_offsets[start_line];
            // 计算本地起始位置，确保不超过行长度
            let local_start = std::cmp::min(range.start - line_start, shaped_line.text.len());
            // 计算本地结束位置，确保不超过行长度
            let local_end = std::cmp::min(range.end - line_start, shaped_line.text.len());
            
            Some(Bounds::from_corners(
                point(
                    bounds.left() + shaped_line.x_for_index(local_start),
                    bounds.top() + self.line_height * start_line as f32,
                ),
                point(
                    bounds.left() + shaped_line.x_for_index(local_end),
                    bounds.top() + self.line_height * (start_line + 1) as f32,
                ),
            ))
        } else {
            // 多行范围
            let start_shaped_line = last_layout.get(start_line)?;
            let end_shaped_line = last_layout.get(end_line)?;
            let line_start = line_offsets[start_line];
            // 计算起始行的本地位置，确保不超过行长度
            let local_start = std::cmp::min(range.start - line_start, start_shaped_line.text.len());
            let line_end = line_offsets[end_line];
            // 计算结束行的本地位置，确保不超过行长度
            let local_end = std::cmp::min(range.end - line_end, end_shaped_line.text.len());
            
            Some(Bounds::from_corners(
                point(
                    bounds.left() + start_shaped_line.x_for_index(local_start),
                    bounds.top() + self.line_height * start_line as f32,
                ),
                point(
                    bounds.left() + end_shaped_line.x_for_index(local_end),
                    bounds.top() + self.line_height * (end_line + 1) as f32,
                ),
            ))
        }
    }

    fn character_index_for_point(
        &mut self,
        point: gpui::Point<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<usize> {
        let line_point = self.last_bounds?.localize(&point)?;
        let last_layout = self.last_layout.as_ref()?;
        let bounds = self.last_bounds.as_ref()?;

        // 计算点击位置所在的行
        let line_height = self.line_height;
        let line_index = ((line_point.y - bounds.top()) / line_height) as usize;
        
        if line_index >= last_layout.len() {
            // 点击位置在最后一行之后，返回文本末尾
            return Some(self.offset_to_utf16(self.content.len()));
        }
        
        // 获取该行的布局信息
        let shaped_line = last_layout.get(line_index)?;
        
        // 计算该行的起始偏移量
        let lines: Vec<&str> = self.content.split_inclusive('\n').collect();
        let line_start: usize = lines.iter().take(line_index).map(|line| line.len()).sum();
        
        // 计算该行内的字符索引
        let utf8_index = shaped_line.index_for_x(line_point.x - bounds.left())?;
        let total_index = line_start + utf8_index;
        
        Some(self.offset_to_utf16(total_index))
    }
}

struct TextElement {
    input: Entity<TextInput>,
}

struct PrepaintState {
    lines: Vec<ShapedLine>,
    cursor: Option<PaintQuad>,
    selections: Vec<PaintQuad>,
}

impl IntoElement for TextElement {
    type Element = Self;

    fn into_element(self) -> Self::Element {
        self
    }
}

impl Element for TextElement {
    type RequestLayoutState = ();
    type PrepaintState = PrepaintState;

    fn id(&self) -> Option<ElementId> {
        None
    }

    fn source_location(&self) -> Option<&'static core::panic::Location<'static>> {
        None
    }

    fn request_layout(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> (LayoutId, Self::RequestLayoutState) {
        let input = self.input.read(cx);
        let line_count = if input.content.is_empty() {
            1
        } else {
            input.content.split_inclusive('\n').count()
        };
        let line_height = window.line_height();
        let content_height = line_height * line_count as f32;
        
        let mut style = Style::default();
        style.size.width = relative(1.).into();
        style.size.height = content_height.into();
        (window.request_layout(style, [], cx), ())
    }

    fn prepaint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        window: &mut Window,
        cx: &mut App,
    ) -> Self::PrepaintState {
        let input = self.input.read(cx);
        let content = input.content.clone();
        let selected_range = input.selected_range.clone();
        let cursor = input.cursor_offset();
        let style = window.text_style();
        let line_height = window.line_height();

        let content_len = input.content.len();
        let (display_text, text_color) = if content.is_empty() {
            (input.placeholder.clone(), hsla(0., 0., 0., 0.2))
        } else {
            (content, style.color)
        };

        let font_size = style.font_size.to_pixels(window.rem_size());
        let text_system = window.text_system();
        
        // 按换行符分割文本为多行，保留换行符用于偏移量计算
        let lines_with_newlines: Vec<String> = display_text.split_inclusive('\n').map(|s| s.to_string()).collect();
        
        // 确保至少有一行（空文本时）
        let lines_with_newlines = if lines_with_newlines.is_empty() {
            vec!["\n".to_string()]
        } else {
            lines_with_newlines
        };
        let mut shaped_lines = Vec::new();
        let mut selections = Vec::new();
        let mut cursor_opt = None;
        
        let mut current_offset = 0;
        let mut y_offset = bounds.top();
        
        for (line_idx, line_with_newline) in lines_with_newlines.iter().enumerate() {
            // 去掉换行符用于shape_line
            let line_text: String = line_with_newline.trim_end_matches('\n').to_string();
            
            let run = TextRun {
                len: line_text.len(),
                font: style.font(),
                color: text_color,
                background_color: None,
                underline: None,
                strikethrough: None,
            };
            
            let runs = vec![run];
            
            let shaped_line = text_system.shape_line(line_text.clone().into(), font_size, &runs, None);
            shaped_lines.push(shaped_line.clone());
            
            // 计算选择区域（使用包含换行符的长度）
            let line_start = current_offset;
            let line_end = current_offset + line_with_newline.len();
            
            if selected_range.start < line_end && selected_range.end > line_start {
                // 计算当前行内的选择起始位置
                let local_start = if selected_range.start >= line_start {
                    std::cmp::min(selected_range.start - line_start, line_text.len())
                } else {
                    0
                };
                
                // 计算选择结束位置，如果超过行长度则限制在行尾
                let local_end = if selected_range.end <= line_end {
                    std::cmp::min(selected_range.end - line_start, line_text.len())
                } else {
                    line_text.len()
                };
                
                // 只有当选择范围有效时才添加选择区域
                if local_start < local_end {
                    selections.push(fill(
                        Bounds::from_corners(
                            point(
                                bounds.left() + shaped_line.x_for_index(local_start),
                                y_offset,
                            ),
                            point(
                                bounds.left() + shaped_line.x_for_index(local_end),
                                y_offset + line_height,
                            ),
                        ),
                        rgba(0x3311ff30),
                    ));
                }
            }
            
            // 计算光标位置
            if cursor >= line_start && cursor <= line_end {
                let local_cursor = cursor - line_start;
                println!("Calculating cursor position for line {}: local_cursor={}, line_text.len()={}", line_idx, local_cursor, line_text.len());
                // 允许光标显示在行末
                if local_cursor <= line_text.len() {
                    let cursor_x = if local_cursor < line_text.len() {
                        bounds.left() + shaped_line.x_for_index(local_cursor)
                    } else {
                        // 光标在行末，使用行的宽度
                        bounds.left() + shaped_line.width
                    };
                    println!("Cursor position: x={}, y={}", cursor_x, y_offset);
                    cursor_opt = Some(fill(
                        Bounds::new(
                            point(cursor_x, y_offset),
                            size(px(2.), line_height),
                        ),
                        gpui::blue(),
                    ));
                } else {
                    println!("Cursor beyond line end, skipping this line");
                }
            }
            
            current_offset = line_end;
            y_offset += line_height;
        }
        
        // 特殊处理：当光标在整个文本的末尾时，确保光标显示在最后一行的末尾
        if cursor_opt.is_none() {
            if cursor == content_len {
                // 检查文本是否以换行符结尾
                let ends_with_newline = input.content.ends_with('\n');
                println!("Cursor at content end, ends_with_newline: {}", ends_with_newline);
                
                if ends_with_newline {
                    // 如果文本以换行符结尾，显示在下一行的开头
                    let last_line_index = shaped_lines.len();
                    let next_line_y_offset = bounds.top() + line_height * last_line_index as f32;
                    println!("Setting cursor at next line {} with y_offset: {}", last_line_index, next_line_y_offset);
                    cursor_opt = Some(fill(
                        Bounds::new(
                            point(bounds.left(), next_line_y_offset),
                            size(px(2.), line_height),
                        ),
                        gpui::blue(),
                    ));
                } else if let Some(last_shaped_line) = shaped_lines.last() {
                    // 计算最后一行的位置
                    let last_line_index = shaped_lines.len() - 1;
                    let last_line_y_offset = bounds.top() + line_height * last_line_index as f32;
                    // 确保光标显示在最后一行的末尾
                    cursor_opt = Some(fill(
                        Bounds::new(
                            point(bounds.left() + last_shaped_line.width, last_line_y_offset),
                            size(px(2.), line_height),
                        ),
                        gpui::blue(),
                    ));
                } else if shaped_lines.is_empty() {
                    // 空文本时，光标显示在左上角
                    cursor_opt = Some(fill(
                        Bounds::new(
                            point(bounds.left(), bounds.top()),
                            size(px(2.), line_height),
                        ),
                        gpui::blue(),
                    ));
                }
            } else {
                // 光标在换行符位置，显示在下一行的开头
                println!("Special handling for cursor at newline position: {}", cursor);
                let lines: Vec<&str> = input.content.split_inclusive('\n').collect();
                println!("Lines: {:?}", lines);
                println!("Lines length: {}", lines.len());
                let mut current_offset = 0;
                for (i, line) in lines.iter().enumerate() {
                    println!("Checking line {}: {:?}, current_offset: {}, line.len(): {}, condition: {} >= {}", i, line, current_offset, line.len(), current_offset + line.len(), cursor);
                    if current_offset + line.len() >= cursor {
                        // 检查是否有下一行
                        println!("Condition met, i: {}, i+1: {}, lines.len(): {}", i, i+1, lines.len());
                        // 计算下一行的位置
                        let next_line_index = i + 1;
                        let next_line_y_offset = bounds.top() + line_height * next_line_index as f32;
                        println!("Setting cursor at next line {} with y_offset: {}", next_line_index, next_line_y_offset);
                        cursor_opt = Some(fill(
                            Bounds::new(
                                point(bounds.left(), next_line_y_offset),
                                size(px(2.), line_height),
                            ),
                            gpui::blue(),
                        ));
                        break;
                    }
                    current_offset += line.len();
                }
            }
        }
        
        PrepaintState {
            lines: shaped_lines,
            cursor: cursor_opt,
            selections,
        }
    }

    fn paint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        prepaint: &mut Self::PrepaintState,
        window: &mut Window,
        cx: &mut App,
    ) {
        let focus_handle = self.input.read(cx).focus_handle.clone();
        window.handle_input(
            &focus_handle,
            ElementInputHandler::new(bounds, self.input.clone()),
            cx,
        );
        
        // 绘制选择区域
        for selection in prepaint.selections.drain(..) {
            window.paint_quad(selection);
        }
        
        // 绘制多行文本
        let line_height = window.line_height();
        let mut y_offset = bounds.top();
        let mut shaped_lines = Vec::new();
        
        for line in prepaint.lines.drain(..) {
            line.paint(point(bounds.left(), y_offset), line_height, window, cx).unwrap();
            shaped_lines.push(line);
            y_offset += line_height;
        }

        // 绘制光标
        if focus_handle.is_focused(window)
            && let Some(cursor) = prepaint.cursor.take()
        {
            window.paint_quad(cursor);
        }

        self.input.update(cx, |input, _cx| {
            input.last_layout = Some(shaped_lines);
            input.last_bounds = Some(bounds);
            input.line_height = line_height;
        });
    }
}

impl Render for TextInput {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .key_context("TextInput")
            .track_focus(&self.focus_handle(cx))
            .cursor(CursorStyle::IBeam)
            .on_action(cx.listener(Self::backspace))
            .on_action(cx.listener(Self::delete))
            .on_action(cx.listener(Self::left))
            .on_action(cx.listener(Self::right))
            .on_action(cx.listener(Self::select_left))
            .on_action(cx.listener(Self::select_right))
            .on_action(cx.listener(Self::select_all))
            .on_action(cx.listener(Self::home))
            .on_action(cx.listener(Self::end))
            .on_action(cx.listener(Self::up))
            .on_action(cx.listener(Self::down))
            .on_action(cx.listener(Self::enter))
            .on_action(cx.listener(Self::show_character_palette))
            .on_action(cx.listener(Self::paste))
            .on_action(cx.listener(Self::cut))
            .on_action(cx.listener(Self::copy))
            .on_mouse_down(MouseButton::Left, cx.listener(Self::on_mouse_down))
            .on_mouse_up(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_up_out(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_move(cx.listener(Self::on_mouse_move))
            .bg(rgb(0xeeeeee))
            .h_full()
            .line_height(px(30.))
            .text_size(px(24.))
            .child(
                div()
                    .id("text_input_container")
                    .h_full()
                    .w_full()
                    .p(px(4.))
                    .bg(white())
                    .overflow_scroll()
                    .scrollbar_width(px(20.))
                    .track_scroll(&self.scroll_handle)
                    .child(TextElement { input: cx.entity() }),
            )
    }
}

impl Focusable for TextInput {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

struct InputExample {
    text_input: Entity<TextInput>,
    recent_keystrokes: Vec<Keystroke>,
    focus_handle: FocusHandle,
}

impl Focusable for InputExample {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl InputExample {
    fn on_reset_click(&mut self, _: &MouseUpEvent, _window: &mut Window, cx: &mut Context<Self>) {
        self.recent_keystrokes.clear();
        self.text_input
            .update(cx, |text_input, _cx| text_input.reset());
        cx.notify();
    }
}

impl Render for InputExample {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .bg(rgb(0xaaaaaa))
            .track_focus(&self.focus_handle(cx))
            .flex()
            .flex_col()
            .size_full()
            .child(
                div()
                    .bg(white())
                    .border_b_1()
                    .border_color(black())
                    .flex()
                    .flex_row()
                    .justify_between()
                    .child(format!("Keyboard {}", cx.keyboard_layout().name()))
                    .child(
                        div()
                            .border_1()
                            .border_color(black())
                            .px_2()
                            .bg(yellow())
                            .child("Reset")
                            .hover(|style| {
                                style
                                    .bg(yellow().blend(opaque_grey(0.5, 0.5)))
                                    .cursor_pointer()
                            })
                            .on_mouse_up(MouseButton::Left, cx.listener(Self::on_reset_click)),
                    ),
            )
            .child(self.text_input.clone())
            // .children(self.recent_keystrokes.iter().rev().map(|ks| {
            //     format!(
            //         "{:} {}",
            //         ks.unparse(),
            //         if let Some(key_char) = ks.key_char.as_ref() {
            //             format!("-> {:?}", key_char)
            //         } else {
            //             "".to_owned()
            //         }
            //     )
            // }))
    }
}

fn main() {
    Application::new().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(920.), px(720.0)), cx);
        cx.bind_keys([
            KeyBinding::new("backspace", Backspace, None),
            KeyBinding::new("delete", Delete, None),
            KeyBinding::new("left", Left, None),
            KeyBinding::new("right", Right, None),
            KeyBinding::new("up", Up, None),
            KeyBinding::new("down", Down, None),
            KeyBinding::new("shift-left", SelectLeft, None),
            KeyBinding::new("shift-right", SelectRight, None),
            KeyBinding::new("cmd-a", SelectAll, None),
            KeyBinding::new("cmd-v", Paste, None),
            KeyBinding::new("cmd-c", Copy, None),
            KeyBinding::new("cmd-x", Cut, None),
            KeyBinding::new("home", Home, None),
            KeyBinding::new("end", End, None),
            KeyBinding::new("enter", Enter, None),
            KeyBinding::new("ctrl-cmd-space", ShowCharacterPalette, None),
        ]);

        let window = cx
            .open_window(
                WindowOptions {
                    window_bounds: Some(WindowBounds::Windowed(bounds)),
                    ..Default::default()
                },
                |_, cx| {
                    let text_input = cx.new(|cx| TextInput {
                        focus_handle: cx.focus_handle(),
                        content: "".into(),
                        placeholder: "Type here...".into(),
                        selected_range: 0..0,
                        selection_reversed: false,
                        marked_range: None,
                        last_layout: None,
                        last_bounds: None,
                        is_selecting: false,
                        line_height: px(24.),
                        scroll_handle: ScrollHandle::new(),
                    });
                    cx.new(|cx| InputExample {
                        text_input,
                        recent_keystrokes: vec![],
                        focus_handle: cx.focus_handle(),
                    })
                },
            )
            .unwrap();
        let view = window.update(cx, |_, _, cx| cx.entity()).unwrap();
        cx.observe_keystrokes(move |ev, _, cx| {
            view.update(cx, |view, cx| {
                view.recent_keystrokes.push(ev.keystroke.clone());
                cx.notify();
            })
        })
        .detach();
        cx.on_keyboard_layout_change({
            move |cx| {
                window.update(cx, |_, _, cx| cx.notify()).ok();
            }
        })
        .detach();

        window
            .update(cx, |view, window, cx| {
                window.focus(&view.text_input.focus_handle(cx));
                cx.activate(true);
            })
            .unwrap();
        cx.on_action(|_: &Quit, cx| cx.quit());
        cx.bind_keys([KeyBinding::new("cmd-q", Quit, None)]);
    });
}
