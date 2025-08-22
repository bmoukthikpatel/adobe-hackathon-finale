#!/usr/bin/env python3
"""
Production-grade PDF merger script using PyMuPDF (fitz).
Enhanced with robust features from process_pdfs.py for professional deployment.

Features:
- Input folder-based processing
- Intelligent PDF selection and constraint handling
- Multi-strategy PDF validation
- Advanced error handling and recovery
- Comprehensive logging and reporting

Requirements:
- PyMuPDF (fitz): pip install PyMuPDF
- Python 3.7+

Author: AI Assistant
Version: 2.0 (Enhanced with process_pdfs.py features)
"""

import sys
import os
import argparse
import hashlib
import json
import time
import logging
import unicodedata
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing as mp
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pdf_merger.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class PDFMergerError(Exception):
    """Custom exception for PDF merger operations."""
    pass


class EnhancedPDFMerger:
    """
    Enhanced production-grade PDF merger with robust features from process_pdfs.py.

    Features:
    - Input folder-based processing
    - Intelligent PDF selection and batching
    - Advanced PDF validation and analysis
    - Multi-strategy error handling
    - Comprehensive logging and reporting
    - Cross-platform compatibility
    """

    # Constants for validation
    MIN_FILES = 2
    MAX_FILES = 10
    MAX_PAGES_PER_FILE = 200
    OUTPUT_FILENAME = "merged_output.pdf"
    INPUT_FOLDER = "input"
    OUTPUT_FOLDER = "output"

    def __init__(self):
        """Initialize the enhanced PDF merger with robust features."""
        self.input_files: List[str] = []
        self.output_path: str = self.OUTPUT_FILENAME
        self.input_dir: Path = Path(self.INPUT_FOLDER)
        self.output_dir: Path = Path(self.OUTPUT_FOLDER)
        self.setup_directories()
        self.setup_advanced_validation()

    def setup_directories(self):
        """Setup input and output directories with proper error handling."""
        try:
            # Create input directory if it doesn't exist
            self.input_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Input directory ready: {self.input_dir.absolute()}")

            # Create output directory if it doesn't exist
            self.output_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Output directory ready: {self.output_dir.absolute()}")

        except Exception as e:
            raise PDFMergerError(f"Failed to setup directories: {str(e)}")

    def setup_advanced_validation(self):
        """Setup advanced validation patterns from process_pdfs.py."""
        # PDF validation patterns
        self.pdf_signatures = [
            b'%PDF-1.',  # Standard PDF signature
            b'%PDF-2.',  # PDF 2.0 signature
        ]

        # File size limits (in bytes)
        self.max_file_size = 400 * 1024 * 1024  # 400MB per file
        self.max_total_size = 1024 * 1024 * 1024  # 1GB total

        # Performance tracking
        self.processing_stats = {
            'files_processed': 0,
            'total_pages': 0,
            'processing_time': 0,
            'errors_encountered': 0
        }
    
    def discover_input_pdfs(self) -> List[Path]:
        """
        Discover PDF files in the input directory with advanced filtering.
        Based on process_pdfs.py file discovery logic.

        Returns:
            List[Path]: List of valid PDF file paths
        """
        try:
            # Find all PDF files in input directory (case insensitive, no duplicates)
            pdf_files = set()
            pdf_files.update(self.input_dir.glob("*.pdf"))
            pdf_files.update(self.input_dir.glob("*.PDF"))

            # Convert back to list
            pdf_files = list(pdf_files)

            if not pdf_files:
                logger.warning(f"No PDF files found in {self.input_dir}")
                return []

            # Keep files in folder order (no sorting)
            # Files will be processed in the order they appear in the folder

            logger.info(f"Discovered {len(pdf_files)} PDF files in input directory")
            for pdf_file in pdf_files:
                logger.info(f"  - {pdf_file.name}")

            return pdf_files

        except Exception as e:
            logger.error(f"Error discovering PDF files: {e}")
            return []

    def analyze_pdf_constraints(self, pdf_files: List[Path]) -> Dict:
        """
        Analyze PDF files against constraints and categorize them.

        Args:
            pdf_files: List of PDF file paths

        Returns:
            Dict: Analysis results with categorized files
        """
        analysis = {
            'valid_files': [],
            'oversized_files': [],
            'corrupted_files': [],
            'inaccessible_files': [],
            'total_valid_pages': 0,
            'file_details': {}
        }

        for pdf_file in pdf_files:
            try:
                # Check file accessibility
                if not self.is_file_accessible(pdf_file):
                    analysis['inaccessible_files'].append(pdf_file)
                    continue

                # Validate PDF and get page count
                page_count = self.validate_pdf_file_advanced(pdf_file)

                if page_count > self.MAX_PAGES_PER_FILE:
                    analysis['oversized_files'].append(pdf_file)
                    analysis['file_details'][str(pdf_file)] = {
                        'pages': page_count,
                        'status': 'oversized',
                        'reason': f'Exceeds {self.MAX_PAGES_PER_FILE} page limit'
                    }
                else:
                    analysis['valid_files'].append(pdf_file)
                    analysis['total_valid_pages'] += page_count
                    analysis['file_details'][str(pdf_file)] = {
                        'pages': page_count,
                        'status': 'valid',
                        'reason': 'Meets all constraints'
                    }

            except PDFMergerError as e:
                analysis['corrupted_files'].append(pdf_file)
                analysis['file_details'][str(pdf_file)] = {
                    'pages': 0,
                    'status': 'corrupted',
                    'reason': str(e)
                }
            except Exception as e:
                analysis['inaccessible_files'].append(pdf_file)
                analysis['file_details'][str(pdf_file)] = {
                    'pages': 0,
                    'status': 'error',
                    'reason': str(e)
                }

        return analysis

    def is_file_accessible(self, file_path: Path) -> bool:
        """Check if file is accessible with enhanced validation."""
        try:
            if not file_path.exists():
                return False
            if not file_path.is_file():
                return False
            if not os.access(file_path, os.R_OK):
                return False

            # Check file size
            file_size = file_path.stat().st_size
            if file_size == 0:
                return False
            if file_size > self.max_file_size:
                logger.warning(f"File {file_path.name} exceeds size limit: {file_size / (1024*1024):.1f}MB")
                return False

            # Quick PDF signature check
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(8)
                    if not any(header.startswith(sig) for sig in self.pdf_signatures):
                        return False
            except Exception:
                return False

            return True

        except Exception:
            return False

    def select_files_for_merging(self, valid_files: List[Path]) -> List[List[Path]]:
        """
        Select files for merging. Return error if more than MAX_FILES.

        Args:
            valid_files: List of valid PDF files

        Returns:
            List[List[Path]]: Single batch of files for merging

        Raises:
            PDFMergerError: If more than MAX_FILES are provided
        """
        if len(valid_files) > self.MAX_FILES:
            raise PDFMergerError(
                f"Too many files provided. Maximum {self.MAX_FILES} files allowed, got {len(valid_files)}."
            )
        
        if len(valid_files) < self.MIN_FILES:
            logger.warning(f"Only {len(valid_files)} valid files found, need at least {self.MIN_FILES}")
            return []

        # Return single batch with all files
        return [valid_files]

    def validate_file_count(self, file_paths: List[str]) -> None:
        """
        Validate that the number of input files is within acceptable range.
        
        Args:
            file_paths: List of file paths to validate
            
        Raises:
            PDFMergerError: If file count is outside valid range
        """
        file_count = len(file_paths)
        if file_count < self.MIN_FILES:
            raise PDFMergerError(
                f"Insufficient files provided. Need at least {self.MIN_FILES} files, got {file_count}."
            )
        if file_count > self.MAX_FILES:
            raise PDFMergerError(
                f"Too many files provided. Maximum {self.MAX_FILES} files allowed, got {file_count}."
            )
    
    def validate_file_exists(self, file_path: str) -> None:
        """
        Validate that a file exists and is accessible.
        
        Args:
            file_path: Path to the file to validate
            
        Raises:
            PDFMergerError: If file doesn't exist or isn't accessible
        """
        if not os.path.exists(file_path):
            raise PDFMergerError(f"File not found: {file_path}")
        
        if not os.path.isfile(file_path):
            raise PDFMergerError(f"Path is not a file: {file_path}")
        
        if not os.access(file_path, os.R_OK):
            raise PDFMergerError(f"Permission denied reading file: {file_path}")
    
    def validate_pdf_file_advanced(self, file_path: Path) -> int:
        """
        Advanced PDF validation with comprehensive checks from process_pdfs.py.

        Args:
            file_path: Path to the PDF file to validate

        Returns:
            int: Number of pages in the PDF

        Raises:
            PDFMergerError: If file is not a valid PDF or exceeds constraints
        """
        try:
            start_time = time.time()

            # Attempt to open the PDF file with enhanced error handling
            doc = fitz.open(str(file_path))
            page_count = len(doc)

            # Advanced PDF structure validation
            self.validate_pdf_structure(doc, file_path)

            # Check page count limit
            if page_count > self.MAX_PAGES_PER_FILE:
                doc.close()
                raise PDFMergerError(
                    f"PDF '{file_path.name}' has {page_count} pages, "
                    f"exceeding the limit of {self.MAX_PAGES_PER_FILE} pages."
                )

            # Validate PDF content integrity
            self.validate_pdf_content(doc, file_path)

            doc.close()

            validation_time = time.time() - start_time
            logger.debug(f"Validated {file_path.name} in {validation_time:.3f}s: {page_count} pages")

            return page_count

        except fitz.FileDataError:
            raise PDFMergerError(f"File '{file_path.name}' is not a valid PDF or is corrupted.")
        except fitz.FileNotFoundError:
            raise PDFMergerError(f"PDF file not found: {file_path.name}")
        except PDFMergerError:
            raise  # Re-raise our custom errors
        except Exception as e:
            raise PDFMergerError(f"Error validating PDF '{file_path.name}': {str(e)}")

    def validate_pdf_structure(self, doc, file_path: Path) -> None:
        """
        Validate PDF internal structure for integrity.
        Based on process_pdfs.py validation approach.
        """
        try:
            # Check if document has pages
            if len(doc) == 0:
                raise PDFMergerError(f"PDF '{file_path.name}' contains no pages")

            # Test access to first and last pages
            first_page = doc[0]
            last_page = doc[-1]

            # Try to extract basic information from pages
            first_page.get_text()
            last_page.get_text()

            # Check for encryption/password protection
            if doc.needs_pass:
                raise PDFMergerError(f"PDF '{file_path.name}' is password protected")

            # Validate document metadata
            metadata = doc.metadata
            if metadata is None:
                logger.warning(f"PDF '{file_path.name}' has no metadata")

        except PDFMergerError:
            raise  # Re-raise our custom errors
        except Exception as e:
            raise PDFMergerError(f"PDF structure validation failed for '{file_path.name}': {str(e)}")

    def validate_pdf_content(self, doc, file_path: Path) -> None:
        """
        Validate PDF content for processing compatibility.
        Enhanced validation from process_pdfs.py approach.
        """
        try:
            # Sample a few pages for content validation
            sample_pages = min(3, len(doc))

            for page_num in range(sample_pages):
                page = doc[page_num]

                # Try to extract text
                text = page.get_text()

                # Try to get page dimensions
                rect = page.rect
                if rect.width <= 0 or rect.height <= 0:
                    raise PDFMergerError(f"Invalid page dimensions in '{file_path.name}' page {page_num + 1}")

                # Check for extremely large pages (potential issues)
                if rect.width > 14400 or rect.height > 14400:  # 200 inches at 72 DPI
                    logger.warning(f"Very large page detected in '{file_path.name}' page {page_num + 1}")

        except PDFMergerError:
            raise  # Re-raise our custom errors
        except Exception as e:
            logger.warning(f"Content validation warning for '{file_path.name}': {str(e)}")
            # Don't fail on content validation issues, just warn

    def validate_pdf_file(self, file_path: str) -> int:
        """
        Legacy method for backward compatibility.
        Redirects to advanced validation.
        """
        return self.validate_pdf_file_advanced(Path(file_path))
    
    def calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate SHA-256 hash of a file for comparison.
        
        Args:
            file_path: Path to the file
            
        Returns:
            str: SHA-256 hash of the file
        """
        hash_sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                # Read file in chunks to handle large files efficiently
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            raise PDFMergerError(f"Error calculating hash for '{file_path}': {str(e)}")

    def find_file_with_most_pages(self, files: List[Path]) -> Path:
        """
        Find the file with the most pages among the given files.
        
        Args:
            files: List of PDF file paths
            
        Returns:
            Path: File with the most pages
        """
        max_pages = 0
        file_with_most_pages = None
        
        for file in files:
            try:
                doc = fitz.open(str(file))
                page_count = len(doc)
                doc.close()
                
                if page_count > max_pages:
                    max_pages = page_count
                    file_with_most_pages = file
            except Exception:
                continue
        
        return file_with_most_pages

    def generate_output_filename(self, base_filename: str) -> str:
        """
        Generate output filename with incremental numbering if file exists.
        
        Args:
            base_filename: Base filename without extension
            
        Returns:
            str: Available filename
        """
        counter = 0
        while True:
            if counter == 0:
                filename = f"{base_filename}.merged.pdf"
            else:
                filename = f"{base_filename}.merged[{counter}].pdf"
            
            output_path = self.output_dir / filename
            if not output_path.exists():
                return str(output_path)
            
            counter += 1
    
    def check_output_file_exists(self) -> bool:
        """
        Check if output file already exists and prompt for overwrite confirmation.
        
        Returns:
            bool: True if should proceed, False if should abort
        """
        if os.path.exists(self.output_path):
            while True:
                response = input(
                    f"Output file '{self.output_path}' already exists. "
                    "Do you want to overwrite it? (y/n): "
                ).lower().strip()
                
                if response in ['y', 'yes']:
                    return True
                elif response in ['n', 'no']:
                    return False
                else:
                    print("Please enter 'y' for yes or 'n' for no.")
        return True
    
    def merge_pdfs(self, input_files: List[str]) -> Tuple[str, str]:
        """
        Merge multiple PDF files into a single output file.
        
        Args:
            input_files: List of input PDF file paths
            
        Returns:
            Tuple[str, str]: (output_file_path, output_file_hash)
            
        Raises:
            PDFMergerError: If merging fails
        """
        try:
            # Create output document
            merged_doc = fitz.open()
            total_pages = 0
            
            print("Starting PDF merge process...")
            
            # Process each input file in order
            for i, file_path in enumerate(input_files, 1):
                print(f"Processing file {i}/{len(input_files)}: {file_path}")
                
                # Open source document
                source_doc = fitz.open(file_path)
                page_count = len(source_doc)
                
                # Insert all pages from source document
                merged_doc.insert_pdf(source_doc)
                source_doc.close()
                
                total_pages += page_count
                print(f"  Added {page_count} pages (total: {total_pages})")
            
            # Save the merged document
            print(f"Saving merged PDF to: {self.output_path}")
            merged_doc.save(self.output_path)
            merged_doc.close()
            
            # Calculate hash of output file
            output_hash = self.calculate_file_hash(self.output_path)
            
            return self.output_path, output_hash
            
        except Exception as e:
            raise PDFMergerError(f"Error during PDF merging: {str(e)}")
    
    def compare_with_existing(self, new_file_path: str, new_file_hash: str) -> None:
        """
        Compare newly created file with any existing merged PDF using round 1a logic.
        Implements comprehensive comparison including content analysis.

        Args:
            new_file_path: Path to the newly created file
            new_file_hash: Hash of the newly created file
        """
        # Look for any existing merged PDF files
        existing_files = []
        for file in os.listdir('.'):
            if file.startswith('merged_') and file.endswith('.pdf') and file != os.path.basename(new_file_path):
                existing_files.append(file)

        if existing_files:
            print(f"\nComparing with existing merged PDF files...")
            for existing_file in existing_files:
                try:
                    # Hash comparison (primary check)
                    existing_hash = self.calculate_file_hash(existing_file)
                    if existing_hash == new_file_hash:
                        print(f"✓ Content identical to existing file: {existing_file}")
                        continue

                    # Advanced comparison using round 1a approach
                    comparison_result = self.advanced_pdf_comparison(new_file_path, existing_file)
                    if comparison_result['identical']:
                        print(f"✓ Content structurally identical to existing file: {existing_file}")
                        print(f"  - Page count match: {comparison_result['page_count_match']}")
                        print(f"  - Text content similarity: {comparison_result['text_similarity']:.1%}")
                    else:
                        print(f"✗ Content differs from existing file: {existing_file}")
                        print(f"  - Page count: {comparison_result['new_pages']} vs {comparison_result['existing_pages']}")
                        print(f"  - Text similarity: {comparison_result['text_similarity']:.1%}")

                except Exception as e:
                    print(f"⚠ Could not compare with {existing_file}: {str(e)}")

    def advanced_pdf_comparison(self, file1_path: str, file2_path: str) -> dict:
        """
        Advanced PDF comparison using round 1a logic approach.
        Compares page count, text content, and structure.

        Args:
            file1_path: Path to first PDF file
            file2_path: Path to second PDF file

        Returns:
            dict: Comparison results with detailed metrics
        """
        try:
            # Open both PDFs
            doc1 = fitz.open(file1_path)
            doc2 = fitz.open(file2_path)

            # Basic metrics
            pages1 = len(doc1)
            pages2 = len(doc2)
            page_count_match = pages1 == pages2

            # Extract text content from both documents
            text1 = self.extract_pdf_text_content(doc1)
            text2 = self.extract_pdf_text_content(doc2)

            # Calculate text similarity
            text_similarity = self.calculate_text_similarity(text1, text2)

            # Determine if files are identical based on comprehensive criteria
            identical = (
                page_count_match and
                text_similarity > 0.95  # 95% text similarity threshold
            )

            doc1.close()
            doc2.close()

            return {
                'identical': identical,
                'page_count_match': page_count_match,
                'new_pages': pages1,
                'existing_pages': pages2,
                'text_similarity': text_similarity
            }

        except Exception as e:
            raise PDFMergerError(f"Error during advanced PDF comparison: {str(e)}")

    def extract_pdf_text_content(self, doc) -> str:
        """
        Extract text content from PDF document for comparison.
        Based on round 1a text extraction approach.

        Args:
            doc: PyMuPDF document object

        Returns:
            str: Extracted text content
        """
        text_content = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text()

            # Clean and normalize text
            cleaned_text = ' '.join(page_text.split())  # Normalize whitespace
            text_content.append(cleaned_text)

        return '\n'.join(text_content)

    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two text strings.
        Uses character-level comparison for accuracy.

        Args:
            text1: First text string
            text2: Second text string

        Returns:
            float: Similarity ratio (0.0 to 1.0)
        """
        if not text1 and not text2:
            return 1.0
        if not text1 or not text2:
            return 0.0

        # Simple character-level similarity
        len1, len2 = len(text1), len(text2)
        max_len = max(len1, len2)

        if max_len == 0:
            return 1.0

        # Count matching characters at same positions
        matches = sum(1 for i in range(min(len1, len2)) if text1[i] == text2[i])

        # Calculate similarity ratio
        similarity = matches / max_len

        return similarity

    def compare_with_existing_in_output(self, new_file_path: str, new_file_hash: str) -> None:
        """
        Compare newly created file with existing files in output directory.
        Enhanced version for batch processing.
        """
        try:
            # Look for existing merged files in output directory
            existing_files = []
            for file in self.output_dir.glob("merged_*.pdf"):
                if file.name != Path(new_file_path).name:
                    existing_files.append(file)

            if existing_files:
                print(f"Comparing with {len(existing_files)} existing merged files...")
                for existing_file in existing_files:
                    try:
                        # Hash comparison (primary check)
                        existing_hash = self.calculate_file_hash(str(existing_file))
                        if existing_hash == new_file_hash:
                            print(f"✓ Content identical to: {existing_file.name}")
                            continue

                        # Advanced comparison
                        comparison_result = self.advanced_pdf_comparison(new_file_path, str(existing_file))
                        if comparison_result['identical']:
                            print(f"✓ Content structurally identical to: {existing_file.name}")
                        else:
                            print(f"✗ Content differs from: {existing_file.name}")

                    except Exception as e:
                        print(f"⚠ Could not compare with {existing_file.name}: {str(e)}")
            else:
                print("No existing merged files found for comparison.")

        except Exception as e:
            logger.warning(f"Error during file comparison: {e}")
    
    def process_input_folder(self) -> None:
        """
        Main method to process PDFs from input folder with intelligent selection.
        Enhanced with process_pdfs.py robustness features.
        """
        try:
            start_time = time.time()
            logger.info("=== Enhanced PDF Merger - Input Folder Processing ===")

            # Step 1: Discover PDF files
            print("Step 1: Discovering PDF files in input folder...")
            pdf_files = self.discover_input_pdfs()

            if not pdf_files:
                print("❌ No PDF files found in input folder.")
                print(f"Please add PDF files to: {self.input_dir.absolute()}")
                return

            print(f"✓ Found {len(pdf_files)} PDF files")

            # Step 2: Analyze constraints
            print("\nStep 2: Analyzing PDF constraints...")
            analysis = self.analyze_pdf_constraints(pdf_files)

            # Report analysis results
            self.report_constraint_analysis(analysis)

            if not analysis['valid_files']:
                print("❌ No valid PDF files found that meet constraints.")
                return

            # Step 3: Select files for merging
            print("\nStep 3: Selecting files for merging...")
            try:
                batches = self.select_files_for_merging(analysis['valid_files'])
            except PDFMergerError as e:
                print(f"❌ {str(e)}")
                return

            if not batches:
                print("❌ Cannot create valid batches for merging.")
                return

            print(f"✓ Created {len(batches)} merge batch(es)")

            # Step 4: Process each batch
            print("\nStep 4: Processing merge batches...")
            successful_merges = 0

            for batch_num, batch in enumerate(batches, 1):
                try:
                    print(f"\n--- Processing Batch {batch_num}/{len(batches)} ---")
                    output_file = self.process_batch(batch, batch_num)
                    if output_file:
                        successful_merges += 1
                        print(f"✓ Batch {batch_num} completed: {output_file}")
                    else:
                        print(f"✗ Batch {batch_num} failed")

                except Exception as e:
                    logger.error(f"Error processing batch {batch_num}: {e}")
                    print(f"✗ Batch {batch_num} failed: {str(e)}")

            # Step 5: Final report
            total_time = time.time() - start_time
            print(f"\n🎉 Processing completed in {total_time:.2f}s")
            print(f"📊 Successfully merged {successful_merges}/{len(batches)} batches")
            print(f"📁 Output directory: {self.output_dir.absolute()}")

            # Update processing stats
            self.processing_stats['processing_time'] = total_time
            self.processing_stats['files_processed'] = len(analysis['valid_files'])

        except Exception as e:
            logger.error(f"Error in input folder processing: {e}")
            print(f"💥 UNEXPECTED ERROR: {str(e)}")

    def report_constraint_analysis(self, analysis: Dict) -> None:
        """Report the results of constraint analysis."""
        print(f"✓ Valid files: {len(analysis['valid_files'])}")
        print(f"✓ Total valid pages: {analysis['total_valid_pages']}")

        if analysis['oversized_files']:
            print(f"⚠ Oversized files (>{self.MAX_PAGES_PER_FILE} pages): {len(analysis['oversized_files'])}")
            for file in analysis['oversized_files']:
                pages = analysis['file_details'][str(file)]['pages']
                print(f"  - {file.name}: {pages} pages")

        if analysis['corrupted_files']:
            print(f"❌ Corrupted files: {len(analysis['corrupted_files'])}")
            for file in analysis['corrupted_files']:
                reason = analysis['file_details'][str(file)]['reason']
                print(f"  - {file.name}: {reason}")

        if analysis['inaccessible_files']:
            print(f"❌ Inaccessible files: {len(analysis['inaccessible_files'])}")
            for file in analysis['inaccessible_files']:
                reason = analysis['file_details'][str(file)].get('reason', 'Access denied')
                print(f"  - {file.name}: {reason}")

    def process_batch(self, batch: List[Path], batch_num: int) -> Optional[str]:
        """
        Process a single batch of PDF files.

        Args:
            batch: List of PDF files to merge
            batch_num: Batch number for output naming

        Returns:
            Optional[str]: Output file path if successful, None if failed
        """
        try:
            # Convert Path objects to strings for compatibility
            file_paths = [str(file) for file in batch]

            # Find file with most pages for naming
            file_with_most_pages = self.find_file_with_most_pages(batch)
            if file_with_most_pages is None:
                logger.error("Could not determine file with most pages")
                return None

            # Generate output filename based on file with most pages
            base_filename = file_with_most_pages.stem  # filename without extension
            self.output_path = self.generate_output_filename(base_filename)

            print(f"Merging {len(batch)} files:")
            for file in batch:
                print(f"  - {file.name}")
            print(f"Output will be named after: {file_with_most_pages.name} (most pages)")

            # Perform the merge using existing logic
            output_path, output_hash = self.merge_pdfs(file_paths)

            # Compare with existing files in output directory
            self.compare_with_existing_in_output(output_path, output_hash)

            return output_path

        except Exception as e:
            logger.error(f"Error processing batch {batch_num}: {e}")
            return None







def main():
    """Main entry point for the enhanced PDF merger script - Input Folder Mode Only."""
    try:
        print("🎯 Enhanced PDF Merger - Input Folder Processing")
        print("=" * 60)
        print("This tool processes all PDFs from the 'input' folder automatically.")
        print("Perfect for Adobe Hackathon webpage integration!")
        print("=" * 60)

        # Create enhanced merger instance
        merger = EnhancedPDFMerger()

        print(f"\n📁 Input folder: {merger.input_dir.absolute()}")
        print(f"📁 Output folder: {merger.output_dir.absolute()}")
        print("\n💡 To use: Place your PDF files in the 'input' folder and run this script")

        # Always use input folder mode
        merger.process_input_folder()

    except KeyboardInterrupt:
        print("\n⚠ Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        print(f"💥 Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
