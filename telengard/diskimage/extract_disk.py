#!/usr/bin/env python3
"""Extract files from Apple II DOS 3.3 disk image."""

import sys
import os

SECTOR_SIZE = 256
SECTORS_PER_TRACK = 16
TRACK_SIZE = SECTOR_SIZE * SECTORS_PER_TRACK

# DOS 3.3 file types
FILE_TYPES = {
    0x00: 'T',   # Text
    0x01: 'I',   # Integer BASIC
    0x02: 'A',   # Applesoft BASIC
    0x04: 'B',   # Binary
    0x08: 'S',   # S type
    0x10: 'R',   # Relocatable
    0x20: 'a',   # A type
    0x40: 'b',   # B type
}

def read_sector(data, track, sector):
    """Read a sector from disk image."""
    offset = track * TRACK_SIZE + sector * SECTOR_SIZE
    return data[offset:offset + SECTOR_SIZE]

def decode_apple_string(data):
    """Decode Apple II high-bit ASCII string."""
    return ''.join(chr(b & 0x7F) for b in data).strip()

def get_file_type(type_byte):
    """Get file type string."""
    locked = '*' if type_byte & 0x80 else ' '
    ftype = FILE_TYPES.get(type_byte & 0x7F, '?')
    return locked + ftype

def read_catalog(data):
    """Read the disk catalog."""
    files = []

    # Read VTOC at Track 17, Sector 0
    vtoc = read_sector(data, 17, 0)
    cat_track = vtoc[1]
    cat_sector = vtoc[2]

    print(f"DOS 3.3 Disk - Volume {vtoc[6]}")
    print(f"Catalog starts at Track {cat_track}, Sector {cat_sector}")
    print()

    # Follow catalog chain
    while cat_track != 0:
        catalog = read_sector(data, cat_track, cat_sector)

        # Each catalog sector has 7 file entries at 35 bytes each, starting at offset 0x0B
        for i in range(7):
            offset = 0x0B + i * 35
            entry = catalog[offset:offset + 35]

            ts_track = entry[0]
            ts_sector = entry[1]

            if ts_track == 0 or ts_track == 0xFF:
                continue

            file_type = entry[2]
            filename = decode_apple_string(entry[3:33])
            sector_count = entry[33] + (entry[34] << 8)

            files.append({
                'name': filename,
                'type': get_file_type(file_type),
                'type_byte': file_type & 0x7F,
                'track': ts_track,
                'sector': ts_sector,
                'sectors': sector_count,
            })

        # Next catalog sector
        cat_track = catalog[1]
        cat_sector = catalog[2]

    return files

def read_file_content(data, track, sector):
    """Read a file following its track/sector list."""
    content = bytearray()

    while track != 0:
        ts_list = read_sector(data, track, sector)

        # Next T/S list sector
        next_track = ts_list[1]
        next_sector = ts_list[2]

        # Each T/S pair starts at offset 0x0C
        for i in range(122):
            offset = 0x0C + i * 2
            data_track = ts_list[offset]
            data_sector = ts_list[offset + 1]

            if data_track == 0:
                break

            sector_data = read_sector(data, data_track, data_sector)
            content.extend(sector_data)

        track = next_track
        sector = next_sector

    return bytes(content)

def detokenize_applesoft(data):
    """Convert Applesoft BASIC tokens to text."""
    # Applesoft BASIC tokens
    tokens = {
        0x80: "END", 0x81: "FOR", 0x82: "NEXT", 0x83: "DATA", 0x84: "INPUT",
        0x85: "DEL", 0x86: "DIM", 0x87: "READ", 0x88: "GR", 0x89: "TEXT",
        0x8A: "PR#", 0x8B: "IN#", 0x8C: "CALL", 0x8D: "PLOT", 0x8E: "HLIN",
        0x8F: "VLIN", 0x90: "HGR2", 0x91: "HGR", 0x92: "HCOLOR=", 0x93: "HPLOT",
        0x94: "DRAW", 0x95: "XDRAW", 0x96: "HTAB", 0x97: "HOME", 0x98: "ROT=",
        0x99: "SCALE=", 0x9A: "SHLOAD", 0x9B: "TRACE", 0x9C: "NOTRACE",
        0x9D: "NORMAL", 0x9E: "INVERSE", 0x9F: "FLASH", 0xA0: "COLOR=",
        0xA1: "POP", 0xA2: "VTAB", 0xA3: "HIMEM:", 0xA4: "LOMEM:", 0xA5: "ONERR",
        0xA6: "RESUME", 0xA7: "RECALL", 0xA8: "STORE", 0xA9: "SPEED=",
        0xAA: "LET", 0xAB: "GOTO", 0xAC: "RUN", 0xAD: "IF", 0xAE: "RESTORE",
        0xAF: "&", 0xB0: "GOSUB", 0xB1: "RETURN", 0xB2: "REM", 0xB3: "STOP",
        0xB4: "ON", 0xB5: "WAIT", 0xB6: "LOAD", 0xB7: "SAVE", 0xB8: "DEF",
        0xB9: "POKE", 0xBA: "PRINT", 0xBB: "CONT", 0xBC: "LIST", 0xBD: "CLEAR",
        0xBE: "GET", 0xBF: "NEW", 0xC0: "TAB(", 0xC1: "TO", 0xC2: "FN",
        0xC3: "SPC(", 0xC4: "THEN", 0xC5: "AT", 0xC6: "NOT", 0xC7: "STEP",
        0xC8: "SGN", 0xC9: "INT", 0xCA: "ABS", 0xCB: "USR", 0xCC: "FRE",
        0xCD: "SCRN(", 0xCE: "PDL", 0xCF: "POS", 0xD0: "SQR", 0xD1: "RND",
        0xD2: "LOG", 0xD3: "EXP", 0xD4: "COS", 0xD5: "SIN", 0xD6: "TAN",
        0xD7: "ATN", 0xD8: "PEEK", 0xD9: "LEN", 0xDA: "STR$", 0xDB: "VAL",
        0xDC: "ASC", 0xDD: "CHR$", 0xDE: "LEFT$", 0xDF: "RIGHT$", 0xE0: "MID$",
        0xE1: "+", 0xE2: "-", 0xE3: "*", 0xE4: "/", 0xE5: "^", 0xE6: "AND",
        0xE7: "OR", 0xE8: ">", 0xE9: "=", 0xEA: "<", 0xEB: "SGN", 0xEC: "INT",
        0xED: "ABS", 0xEE: "USR", 0xEF: "FRE", 0xF0: "SCRN(", 0xF1: "PDL",
        0xF2: "POS", 0xF3: "SQR", 0xF4: "RND", 0xF5: "LOG", 0xF6: "EXP",
        0xF7: "COS", 0xF8: "SIN", 0xF9: "TAN", 0xFA: "ATN", 0xFB: "PEEK",
        0xFC: "LEN", 0xFD: "STR$", 0xFE: "VAL", 0xFF: "ASC",
    }

    if len(data) < 2:
        return ""

    # Skip first two bytes (program length)
    pos = 2
    lines = []

    while pos < len(data) - 4:
        # Next line pointer (2 bytes)
        next_ptr = data[pos] + (data[pos + 1] << 8)
        if next_ptr == 0:
            break

        # Line number (2 bytes)
        line_num = data[pos + 2] + (data[pos + 3] << 8)
        pos += 4

        # Read line content
        line = f"{line_num} "
        while pos < len(data) and data[pos] != 0:
            byte = data[pos]
            if byte >= 0x80:
                line += tokens.get(byte, f"<${byte:02X}>")
            elif byte >= 0x20:
                line += chr(byte)
            pos += 1
        pos += 1  # Skip null terminator

        lines.append(line)

    return '\n'.join(lines)

def main():
    disk_path = "Telengard_v1.12_1982_Avalon_Hill.do"

    with open(disk_path, 'rb') as f:
        data = f.read()

    print(f"Disk image size: {len(data)} bytes")
    print()

    files = read_catalog(data)

    print("=" * 60)
    print("CATALOG")
    print("=" * 60)
    print(f"{'TYPE':<4} {'SECTORS':<8} {'NAME':<30}")
    print("-" * 60)

    for f in files:
        print(f"{f['type']:<4} {f['sectors']:<8} {f['name']:<30}")

    print()

    # Create output directory
    os.makedirs('extracted', exist_ok=True)

    # Extract each file
    for f in files:
        content = read_file_content(data, f['track'], f['sector'])

        safe_name = f['name'].replace(' ', '_').replace('/', '_')

        # Save raw binary
        with open(f"extracted/{safe_name}.bin", 'wb') as out:
            out.write(content)

        # If Applesoft BASIC, also save detokenized
        if f['type_byte'] == 0x02:
            basic_text = detokenize_applesoft(content)
            with open(f"extracted/{safe_name}.bas", 'w') as out:
                out.write(basic_text)
            print(f"Extracted: {f['name']} -> {safe_name}.bas ({len(content)} bytes)")
        else:
            print(f"Extracted: {f['name']} -> {safe_name}.bin ({len(content)} bytes)")

if __name__ == '__main__':
    main()
