use serde::{Deserialize, Serialize};
use tauri::api::dialog::blocking::FileDialogBuilder;

#[derive(Serialize)]
pub struct SaveResult {
    bytes_written: usize,
}

#[derive(Deserialize)]
pub struct ReadSqliteRequest {
    file_path: String,
}

#[tauri::command]
pub fn choose_open_file() -> Result<String, String> {
    FileDialogBuilder::new()
        .add_filter("Spreadsheet Files", &["xlsx", "kst"])
        .add_filter("Excel Files", &["xlsx"])
        .add_filter("Keste Files", &["kst"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
        .ok_or_else(|| "No file selected".to_string())
}

#[tauri::command]
pub fn choose_save_file(default_name: String) -> Result<String, String> {
    FileDialogBuilder::new()
        .set_file_name(&default_name)
        .add_filter("Keste Spreadsheet", &["kst"])
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

#[tauri::command]
pub fn read_sqlite(request: ReadSqliteRequest) -> Result<String, String> {
    crate::sqlite_reader::read_sqlite(&request.file_path)
        .map_err(|e| format!("SQLite read error: {}", e))
}
