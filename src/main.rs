mod components;

use components::heading::Heading;

use gpui::{
    App, Application, Bounds, Context, Window, WindowBounds, WindowOptions, div, prelude::*, px,
    rgb, size,
};

struct HelloWorld {
    text: Vec<MarkdownElement>,
}

enum MarkdownElement {
    Heading(Heading),
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
                div().p_8().children(
                    self.text
                        .iter()
                        .map(|e| match e {
                            MarkdownElement::Heading(h) => h.render(),
                        })
                        .collect::<Vec<_>>(),
                ),
            )
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
                cx.new(|_| HelloWorld  {
                    text: vec![
                        MarkdownElement::Heading(Heading::new("# Heading 1".into())),
                        MarkdownElement::Heading(Heading::new("## Heading 2".into())),
                        MarkdownElement::Heading(Heading::new("### Heading 3".into())),
                        MarkdownElement::Heading(Heading::new("#### Heading 4".into())),
                        MarkdownElement::Heading(Heading::new("##### Heading 5".into())),
                        MarkdownElement::Heading(Heading::new("###### Heading 6".into())),
                    ],
                })
            },
        )
        .unwrap();
    });
}
