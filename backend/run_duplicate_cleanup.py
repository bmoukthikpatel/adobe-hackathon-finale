#!/usr/bin/env python3
"""
Run duplicate cleanup on existing database
"""

import sys
import os
from pathlib import Path

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.smart_upload_handler import SmartUploadHandler

def main():
    """Run duplicate cleanup"""
    print("🧹 PDF Duplicate Cleanup System")
    print("=" * 50)
    
    # Configuration
    docs_dir = Path("data/documents")
    db_path = "data/documents.db"
    
    # Create handler
    handler = SmartUploadHandler(docs_dir, db_path)
    
    # First, show current duplicate report
    print("📊 Current Duplicate Report:")
    report = handler.get_duplicate_report()
    print(f"   - Duplicate groups: {report['duplicate_groups']}")
    print(f"   - Total duplicate files: {report['total_duplicate_files']}")
    print(f"   - Space wasted: {report['space_wasted_mb']:.2f} MB")
    print()
    
    if report['duplicate_groups'] == 0:
        print("✅ No duplicates found!")
        return
    
    # Show detailed duplicate groups
    print("🔍 Duplicate Groups Found:")
    for i, group in enumerate(report['groups'][:5]):  # Show first 5 groups
        print(f"\n{i+1}. Hash: {group['hash'][:8]}... ({group['total_count']} copies)")
        print(f"   ✅ Keep: {group['keep']['original_name']}")
        print(f"      Upload: {group['keep']['upload_date']} | Last Opened: {group['keep']['last_opened']}")
        
        for doc in group['remove'][:3]:  # Show first 3 to remove
            print(f"   🗑️ Remove: {doc['original_name']}")
            print(f"      Upload: {doc['upload_date']} | Last Opened: {doc['last_opened']}")
        
        if len(group['remove']) > 3:
            print(f"   ... and {len(group['remove']) - 3} more")
    
    if len(report['groups']) > 5:
        print(f"\n... and {len(report['groups']) - 5} more groups")
    
    # Ask user for confirmation
    print(f"\n⚠️ This will remove {report['total_duplicate_files']} duplicate files")
    print(f"   and free up {report['space_wasted_mb']:.2f} MB of space.")
    
    # First run dry run
    print(f"\n🧪 Running DRY RUN first...")
    dry_stats = handler.bulk_cleanup_existing_duplicates(dry_run=True)
    
    print(f"\n❓ Do you want to proceed with the actual cleanup? (y/N): ", end="")
    response = input().strip().lower()
    
    if response in ['y', 'yes']:
        print(f"\n🚀 Running ACTUAL cleanup...")
        actual_stats = handler.bulk_cleanup_existing_duplicates(dry_run=False)
        print(f"\n✅ Cleanup completed successfully!")
    else:
        print(f"\n❌ Cleanup cancelled by user")

if __name__ == "__main__":
    main()
