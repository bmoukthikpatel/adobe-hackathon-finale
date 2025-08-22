#!/usr/bin/env python3
"""
Restore deleted documents in the database
"""

import sqlite3

def restore_documents():
    """Restore all deleted documents"""
    conn = sqlite3.connect('data/documents.db')
    cursor = conn.cursor()

    # Update all deleted documents back to uploaded status
    cursor.execute('UPDATE documents SET status = "uploaded" WHERE status = "deleted"')
    affected = cursor.rowcount
    conn.commit()

    print(f'✅ Restored {affected} documents from deleted status')

    # Verify the change
    cursor.execute('SELECT COUNT(*) FROM documents WHERE status != "deleted"')
    active_count = cursor.fetchone()[0]
    print(f'📊 Active documents now: {active_count}')

    conn.close()

if __name__ == "__main__":
    restore_documents()
