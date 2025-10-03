use serde::{Deserialize, Serialize};
use tauri::api::dialog::blocking::FileDialogBuilder;

#[derive(Serialize)]
pub struct SaveResult {
    bytes_written: usize,
}

#[tauri::command]
pub fn choose_open_file() -> Result<String, String> {
    FileDialogBuilder::new()
        .add_filter("Excel Files", &["xlsx"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
        .ok_or_else(|| "No file selected".to_string())
}

#[tauri::command]
pub fn choose_save_file(default_name: String) -> Result<String, String> {
    FileDialogBuilder::new()
        .set_file_name(&default_name)
        .add_filter("SQLite Database", &["sqlite", "db"])
        .save_file()
        .map(|path| path.to_string_lossy().to_string())
        .ok_or_else(|| "No file selected".to_string())
}

#[derive(Deserialize)]
pub struct SaveSqliteRequest {
    sql_dump: String,
    out_path: String,
}

#[tauri::command]
pub fn save_sqlite(request: SaveSqliteRequest) -> Result<SaveResult, String> {
    crate::sqlite_writer::write_sqlite(&request.sql_dump, &request.out_path)
        .map(|bytes| SaveResult {
            bytes_written: bytes,
        })
        .map_err(|e| format!("SQLite write error: {}", e))
}
