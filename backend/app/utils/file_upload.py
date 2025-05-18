# app/utils/file_upload.py
import os
import uuid
from fastapi import UploadFile
import aiofiles
from PIL import Image
import io

# Define your storage settings
UPLOAD_DIR = "uploads/candidates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save an uploaded file and return the file path."""
    # Generate unique filename
    file_extension = os.path.splitext(upload_file.filename)[1]
    new_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save the file
    async with aiofiles.open(file_path, 'wb') as out_file:
        # Read the file in chunks to handle large files
        while content := await upload_file.read(1024 * 1024):  # Read 1MB at a time
            await out_file.write(content)
    
    # Optimize image if it's an image
    if file_extension.lower() in ['.jpg', '.jpeg', '.png']:
        # Open and resize image to a reasonable size
        with Image.open(file_path) as img:
            # Resize if the image is too large (e.g., > 1000px)
            max_size = 1000
            if img.width > max_size or img.height > max_size:
                # Calculate new dimensions while preserving aspect ratio
                ratio = min(max_size / img.width, max_size / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            
            # Save the optimized image
            img.save(file_path, optimize=True, quality=85)
    
    # Return relative path
    return f"/{UPLOAD_DIR}/{new_filename}"