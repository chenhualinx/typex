use gpui::{
    div, prelude::*, px, rgb, size, App, Application, Bounds, Context, SharedString, Window,
    WindowBounds, WindowOptions,
};
 
struct HelloWorld {
    text: SharedString,
}
 
impl Render for HelloWorld {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_3()
            .bg(rgb(0x191D26))
            .size_full()
            .justify_center()
            .items_center()
            .shadow_lg()
            .border_1()
            .text_xl()
            .text_color(rgb(0xE1E3ED))
            .child(format!("{}", &self.text))
    }
}
 
fn main() {
    Application::new().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(1000.), px(650.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                ..Default::default()
            },
            |_, cx| {
                cx.new(|_| HelloWorld {
                    text: "Typex".into(),
                })
            },
        )
        .unwrap();
    });
}