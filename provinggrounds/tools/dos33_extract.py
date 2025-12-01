#!/usr/bin/env python3
"""
DOS 3.3 Disk Image Extractor
Extracts and decodes files from Apple II DOS 3.3 disk images (.dsk)
"""

import os
import sys
import struct

# DOS 3.3 Constants
TRACK_SIZE = 16 * 256  # 16 sectors per track, 256 bytes per sector
SECTOR_SIZE = 256
VTOC_TRACK = 17
VTOC_SECTOR = 0
CATALOG_TRACK = 17
CATALOG_SECTOR_START = 15

# File type codes
FILE_TYPES = {
    0x00: 'T',   # Text
    0x01: 'I',   # Integer BASIC
    0x02: 'A',   # Applesoft BASIC
    0x04: 'B',   # Binary
    0x08: 'S',   # Special (e.g., directory)
    0x10: 'R',   # Relocatable
    0x20: 'a',   # New A type
    0x40: 'b',   # New B type
}

def read_sector(disk_data, track, sector):
    """Read a sector from the disk image."""
    # DOS 3.3 uses a specific sector interleaving
    # For .dsk files, sectors are stored in physical order
    offset = track * TRACK_SIZE + sector * SECTOR_SIZE
    return disk_data[offset:offset + SECTOR_SIZE]

def get_file_type(type_byte):
    """Get file type character from type byte."""
    locked = type_byte & 0x80
    file_type = type_byte & 0x7F
    type_char = FILE_TYPES.get(file_type, '?')
    if locked:
        type_char = '*' + type_char
    return type_char

def parse_catalog(disk_data):
    """Parse the disk catalog and return list of files."""
    files = []

    # Read VTOC to get first catalog sector
    vtoc = read_sector(disk_data, VTOC_TRACK, VTOC_SECTOR)

    # Catalog starts at track 17, sector 15 by default
    cat_track = vtoc[1] if vtoc[1] else CATALOG_TRACK
    cat_sector = vtoc[2] if vtoc[2] else CATALOG_SECTOR_START

    while cat_track != 0:
        sector_data = read_sector(disk_data, cat_track, cat_sector)

        # First two bytes point to next catalog sector
        next_track = sector_data[1]
        next_sector = sector_data[2]

        # Each catalog sector has 7 file entries starting at offset 0x0B
        for i in range(7):
            entry_offset = 0x0B + (i * 0x23)
            entry = sector_data[entry_offset:entry_offset + 0x23]

            if len(entry) < 0x23:
                break

            # First byte is first track of file's track/sector list
            first_ts_track = entry[0]

            # Skip empty or deleted entries
            if first_ts_track == 0 or first_ts_track == 0xFF:
                continue

            first_ts_sector = entry[1]
            file_type = entry[2]

            # Filename is 30 bytes starting at offset 3, high bit set
            filename_bytes = entry[3:33]
            filename = ''.join(chr(b & 0x7F) for b in filename_bytes).strip()

            # Sector count
            sector_count = entry[33] + (entry[34] << 8) if len(entry) > 34 else 0

            files.append({
                'filename': filename,
                'type': get_file_type(file_type),
                'type_byte': file_type,
                'first_ts_track': first_ts_track,
                'first_ts_sector': first_ts_sector,
                'sector_count': sector_count
            })

        cat_track = next_track
        cat_sector = next_sector

    return files

def extract_file(disk_data, file_info):
    """Extract file contents from disk."""
    data = bytearray()

    ts_track = file_info['first_ts_track']
    ts_sector = file_info['first_ts_sector']

    while ts_track != 0:
        ts_list = read_sector(disk_data, ts_track, ts_sector)

        # Next T/S list sector
        next_ts_track = ts_list[1]
        next_ts_sector = ts_list[2]

        # Data sector pairs start at offset 0x0C
        for i in range(122):  # Max 122 sector pairs per T/S list
            offset = 0x0C + (i * 2)
            if offset + 1 >= len(ts_list):
                break

            data_track = ts_list[offset]
            data_sector = ts_list[offset + 1]

            if data_track == 0:
                break

            sector_data = read_sector(disk_data, data_track, data_sector)
            data.extend(sector_data)

        ts_track = next_ts_track
        ts_sector = next_ts_sector

    return bytes(data)

def detokenize_applesoft(data):
    """Convert tokenized Applesoft BASIC to text."""
    # Applesoft BASIC tokens
    tokens = {
        0x80: "END", 0x81: "FOR", 0x82: "NEXT", 0x83: "DATA",
        0x84: "INPUT", 0x85: "DEL", 0x86: "DIM", 0x87: "READ",
        0x88: "GR", 0x89: "TEXT", 0x8A: "PR#", 0x8B: "IN#",
        0x8C: "CALL", 0x8D: "PLOT", 0x8E: "HLIN", 0x8F: "VLIN",
        0x90: "HGR2", 0x91: "HGR", 0x92: "HCOLOR=", 0x93: "HPLOT",
        0x94: "DRAW", 0x95: "XDRAW", 0x96: "HTAB", 0x97: "HOME",
        0x98: "ROT=", 0x99: "SCALE=", 0x9A: "SHLOAD", 0x9B: "TRACE",
        0x9C: "NOTRACE", 0x9D: "NORMAL", 0x9E: "INVERSE", 0x9F: "FLASH",
        0xA0: "COLOR=", 0xA1: "POP", 0xA2: "VTAB", 0xA3: "HIMEM:",
        0xA4: "LOMEM:", 0xA5: "ONERR", 0xA6: "RESUME", 0xA7: "RECALL",
        0xA8: "STORE", 0xA9: "SPEED=", 0xAA: "LET", 0xAB: "GOTO",
        0xAC: "RUN", 0xAD: "IF", 0xAE: "RESTORE", 0xAF: "&",
        0xB0: "GOSUB", 0xB1: "RETURN", 0xB2: "REM", 0xB3: "STOP",
        0xB4: "ON", 0xB5: "WAIT", 0xB6: "LOAD", 0xB7: "SAVE",
        0xB8: "DEF", 0xB9: "POKE", 0xBA: "PRINT", 0xBB: "CONT",
        0xBC: "LIST", 0xBD: "CLEAR", 0xBE: "GET", 0xBF: "NEW",
        0xC0: "TAB(", 0xC1: "TO", 0xC2: "FN", 0xC3: "SPC(",
        0xC4: "THEN", 0xC5: "AT", 0xC6: "NOT", 0xC7: "STEP",
        0xC8: "+", 0xC9: "-", 0xCA: "*", 0xCB: "/",
        0xCC: "^", 0xCD: "AND", 0xCE: "OR", 0xCF: ">",
        0xD0: "=", 0xD1: "<", 0xD2: "SGN", 0xD3: "INT",
        0xD4: "ABS", 0xD5: "USR", 0xD6: "FRE", 0xD7: "SCRN(",
        0xD8: "PDL", 0xD9: "POS", 0xDA: "SQR", 0xDB: "RND",
        0xDC: "LOG", 0xDD: "EXP", 0xDE: "COS", 0xDF: "SIN",
        0xE0: "TAN", 0xE1: "ATN", 0xE2: "PEEK", 0xE3: "LEN",
        0xE4: "STR$", 0xE5: "VAL", 0xE6: "ASC", 0xE7: "CHR$",
        0xE8: "LEFT$", 0xE9: "RIGHT$", 0xEA: "MID$", 0xEB: "GO"
    }

    lines = []
    pos = 0

    # Skip load address (first 2 bytes for A files)
    if len(data) < 2:
        return ""

    # Applesoft files start with a 2-byte load address, then program
    pos = 0

    while pos < len(data) - 4:
        # Each line: 2 bytes next line addr, 2 bytes line number, tokens, 0x00
        if pos + 4 > len(data):
            break

        next_addr = data[pos] | (data[pos + 1] << 8)
        if next_addr == 0:
            break

        line_num = data[pos + 2] | (data[pos + 3] << 8)
        pos += 4

        line_text = f"{line_num} "
        in_string = False
        in_rem = False
        in_data = False

        while pos < len(data) and data[pos] != 0:
            byte = data[pos]

            if in_string:
                if byte == 0x22:  # Quote
                    in_string = False
                line_text += chr(byte & 0x7F)
            elif in_rem or in_data:
                # REM and DATA statements are not tokenized
                line_text += chr(byte & 0x7F)
            elif byte == 0x22:  # Quote
                in_string = True
                line_text += '"'
            elif byte >= 0x80 and byte in tokens:
                token = tokens[byte]
                line_text += token
                if token == "REM":
                    in_rem = True
                elif token == "DATA":
                    in_data = True
            else:
                line_text += chr(byte & 0x7F)

            pos += 1

        pos += 1  # Skip the null terminator
        lines.append(line_text)

    return '\n'.join(lines)

def extract_text_file(data):
    """Extract text file content."""
    # Text files may have high bits set
    text = ''.join(chr(b & 0x7F) if b != 0 else '' for b in data)
    return text

def main():
    if len(sys.argv) < 2:
        print("Usage: dos33_extract.py <disk_image.dsk> [output_dir]")
        sys.exit(1)

    disk_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(disk_path)[0] + '_extracted'

    print(f"Reading disk image: {disk_path}")

    with open(disk_path, 'rb') as f:
        disk_data = f.read()

    if len(disk_data) != 143360:
        print(f"Warning: Disk image is {len(disk_data)} bytes, expected 143360")

    print(f"\nCatalog for {os.path.basename(disk_path)}:")
    print("-" * 60)

    files = parse_catalog(disk_data)

    if not files:
        print("No files found in catalog")
        return

    os.makedirs(output_dir, exist_ok=True)

    for f in files:
        print(f"{f['type']:3s} {f['filename']:30s} {f['sector_count']:4d} sectors")

        # Extract file
        raw_data = extract_file(disk_data, f)

        # Clean filename for filesystem
        clean_name = f['filename'].replace(' ', '_').replace('/', '_')

        # Save raw data
        raw_path = os.path.join(output_dir, clean_name + '.raw')
        with open(raw_path, 'wb') as out:
            out.write(raw_data)

        # Try to decode based on file type
        file_type = f['type'].replace('*', '')  # Remove locked indicator

        if file_type == 'A':
            # Applesoft BASIC
            try:
                decoded = detokenize_applesoft(raw_data)
                if decoded:
                    bas_path = os.path.join(output_dir, clean_name + '.bas')
                    with open(bas_path, 'w') as out:
                        out.write(decoded)
                    print(f"    -> Decoded to {clean_name}.bas")
            except Exception as e:
                print(f"    -> Error decoding Applesoft: {e}")

        elif file_type == 'T':
            # Text file
            try:
                text = extract_text_file(raw_data)
                txt_path = os.path.join(output_dir, clean_name + '.txt')
                with open(txt_path, 'w') as out:
                    out.write(text)
                print(f"    -> Decoded to {clean_name}.txt")
            except Exception as e:
                print(f"    -> Error decoding text: {e}")

        elif file_type == 'B':
            # Binary - save with .bin extension
            bin_path = os.path.join(output_dir, clean_name + '.bin')
            with open(bin_path, 'wb') as out:
                out.write(raw_data)
            print(f"    -> Saved binary as {clean_name}.bin")

    print(f"\nExtracted {len(files)} files to {output_dir}/")

if __name__ == '__main__':
    main()
