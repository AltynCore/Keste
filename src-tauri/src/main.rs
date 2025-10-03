#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod cmds;
mod sqlite_writer;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            cmds::choose_open_file,
            cmds::choose_save_file,
            cmds::save_sqlite
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
