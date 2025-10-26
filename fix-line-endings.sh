#!/bin/bash

# Line Ending Fix Script for Linux/macOS
# Converts CRLF to LF in shell scripts for Docker compatibility

echo ""
echo "================================================"
echo "GreenMatrix Line Ending Fix Utility"
echo "================================================"
echo ""

echo "[INFO] Converting shell scripts to Unix line endings (LF)..."
echo ""

fixed=0
failed=0

# Find all .sh files in scripts directory and root
for file in scripts/*.sh *.sh; do
    if [ -f "$file" ]; then
        # Get original size
        original_size=$(wc -c < "$file" 2>/dev/null || echo 0)

        # Convert line endings
        if command -v dos2unix &> /dev/null; then
            # Use dos2unix if available
            dos2unix "$file" 2>/dev/null && echo "[FIXED] $file - Using dos2unix" && ((fixed++)) || { echo "[ERROR] Failed to process $file" && ((failed++)); }
        elif command -v sed &> /dev/null; then
            # Use sed
            sed -i 's/\r$//' "$file" 2>/dev/null && echo "[FIXED] $file - Using sed" && ((fixed++)) || { echo "[ERROR] Failed to process $file" && ((failed++)); }
        else
            # Use tr as last resort
            tr -d '\r' < "$file" > "$file.tmp" && mv "$file.tmp" "$file" && echo "[FIXED] $file - Using tr" && ((fixed++)) || { echo "[ERROR] Failed to process $file" && ((failed++)); }
        fi

        # Make executable
        chmod +x "$file" 2>/dev/null
    fi
done

echo ""
echo "================================================"
echo "Fix Complete!"
echo "================================================"
echo ""
echo "Summary: $fixed file(s) fixed, $failed error(s)"
echo ""
echo "You can now run: sudo ./setup-greenmatrix.sh"
echo ""
