use rusqlite::{Connection, Result};
use std::fs;

pub fn write_sqlite(sql_dump: &str, out_path: &str) -> Result<usize, Box<dyn std::error::Error>> {
    // Create temporary file for atomic write
    let temp_path = format!("{}.tmp", out_path);

    // Remove temp file if exists
    let _ = fs::remove_file(&temp_path);

    // Create new database
    let conn = Connection::open(&temp_path)?;

    // Execute SQL dump
    conn.execute_batch(sql_dump)?;

    // Get file size
    let metadata = fs::metadata(&temp_path)?;
    let bytes_written = metadata.len() as usize;

    // Close connection explicitly
    drop(conn);

    // Atomic rename
    fs::rename(&temp_path, out_path)?;

    Ok(bytes_written)
}
