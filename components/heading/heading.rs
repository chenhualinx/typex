use gpui::{div, prelude::*, FontWeight};

enum HeadingLevel {
    One,
    Two,
    Three,
    Four,
    Five,
    Six,
}

impl HeadingLevel {
    pub fn from_u8(text: &str) -> Self {
        let level = text.chars().take_while(|&c| c == '#').count();
        let level = level.max(1).min(6);
        match level {
            1 => Self::One,
            2 => Self::Two,
            3 => Self::Three,
            4 => Self::Four,
            5 => Self::Five,
            _ => Self::Six,
        }
    }
}

pub struct Heading {
    level: HeadingLevel,
    text: String,
}


impl Heading {
    pub fn new(text: String) -> Self {
        Self {
            level: HeadingLevel::from_u8(&text),
            text,
        }
    }

    pub fn render(&self) -> impl IntoElement {
        let text = self.text.trim_start_matches('#').trim_start();
        match self.level {
            HeadingLevel::One => div().text_3xl().font_weight(FontWeight::BOLD).child(text.to_string()),
            HeadingLevel::Two => div().text_2xl().font_weight(FontWeight::BOLD).child(text.to_string()),
            HeadingLevel::Three =>  div().text_xl().font_weight(FontWeight::BOLD).child(text.to_string()),
            HeadingLevel::Four =>  div().text_lg().font_weight(FontWeight::BOLD).child(text.to_string()),
            HeadingLevel::Five => div().text_base().font_weight(FontWeight::BOLD).child(text.to_string()),
            _ => div().text_base().child(format!("{}", &self.text)),
        }
    }
}
