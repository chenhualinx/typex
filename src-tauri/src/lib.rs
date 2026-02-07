use serde::{Deserialize, Serialize};
use std::path::Path;
use std::path::PathBuf;
use tauri::command;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileNode {
    name: String,
    path: String,
    is_directory: bool,
    children: Option<Vec<FileNode>>,
}

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn read_directory_sync(path: &Path) -> Result<Vec<FileNode>, String> {
    let mut entries = Vec::new();
    let dir = std::fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_directory = metadata.is_dir();

        let mut node = FileNode {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_directory,
            children: None,
        };

        if is_directory {
            // 递归读取子目录
            match read_directory_sync(&entry_path) {
                Ok(children) => node.children = Some(children),
                Err(_) => node.children = Some(Vec::new()),
            }
        }

        entries.push(node);
    }

    // 排序：目录在前，文件在后
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[command]
async fn read_directory(path: String) -> Result<Vec<FileNode>, String> {
    let path = PathBuf::from(path);
    tokio::task::spawn_blocking(move || read_directory_sync(&path))
        .await
        .map_err(|e| e.to_string())?
}

#[command]
async fn read_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())
}

#[command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_directory,
            read_file,
            write_file
        ])
        .setup(|app| {
            // 创建菜单
            let open_folder = MenuItemBuilder::new("打开文件夹...")
                .id("open_folder")
                .accelerator("Cmd+O")
                .build(app)?;
            
            let save_file = MenuItemBuilder::new("保存")
                .id("save_file")
                .accelerator("Cmd+S")
                .build(app)?;
            
            let separator = PredefinedMenuItem::separator(app)?;

            // 设置菜单
            let settings = SubmenuBuilder::new(app,"settings")
                .build()?;
            
            // 文件菜单
            let file_menu = SubmenuBuilder::new(app, "文件")
                .item(&open_folder)
                .item(&separator)
                .item(&save_file)
                .build()?;
            
            // 编辑菜单
            let edit_menu = SubmenuBuilder::new(app, "编辑")
                .item(&PredefinedMenuItem::undo(app, None)?)
                .item(&PredefinedMenuItem::redo(app, None)?)
                .item(&PredefinedMenuItem::separator(app)?)
                .item(&PredefinedMenuItem::cut(app, None)?)
                .item(&PredefinedMenuItem::copy(app, None)?)
                .item(&PredefinedMenuItem::paste(app, None)?)
                .item(&PredefinedMenuItem::select_all(app, None)?)
                .build()?;
            
            // 主菜单
            let menu = MenuBuilder::new(app)
                .item(&settings)
                .item(&file_menu)
                .item(&edit_menu)
                .build()?;
            
            app.set_menu(menu)?;
            
            // 处理菜单事件
            app.on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "open_folder" => {
                        let _ = app.emit("menu-event", "open_folder");
                    }
                    "save_file" => {
                        let _ = app.emit("menu-event", "save_file");
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
