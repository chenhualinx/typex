mod components;

use components::text::Text;

use gpui::{
    App, Application, Bounds, Context, Window, WindowBounds, WindowOptions, div, prelude::*, px,
    rgb, size,
};

struct HelloWorld {
    text: Vec<String>,
}

impl Render for HelloWorld {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_3()
            .bg(rgb(0x191D26))
            .size_full()
            .justify_start()
            .items_start()
            .shadow_lg()
            .border_1()
            .text_xl()
            .text_color(rgb(0xE1E3ED))
            .child(
                div().p_4().w_full().child(
                    Text::new(self.text.clone()).render(),
                ),
            )
    }
}

const TEXT: &str = r#"
# XXXXX

## Code
```json
{
    "XXXXX": "XXXXX",
    "XXXXX": "XXXXX",
    "XXXXX": [
        "XXXXXxxxxxxxxxxxxxxxxxxx",
        "XXXXX",
        "XXXXX"
    ]
}
```
"#;

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
                    text: TEXT.split('\n').map(|s| s.to_string()).collect(),
                })
            },
        )
        .unwrap();
    });
}
