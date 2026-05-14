import face_recognition
import sys
import os
import json
import base64
import numpy as np
import mysql.connector
from io import BytesIO
from PIL import Image

# ============================================================
#  DB CONFIG — keep this in sync with your index.js settings
# ============================================================
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": "Puranik@1974",
    "database": "attendance_system"
}

def load_known_faces_from_db():
    """
    Reads every student's face_encoding (base64 image) from MySQL,
    computes a face encoding for each, and returns two parallel lists.
    """
    known_encodings = []
    known_roll_nos  = []

    try:
        conn   = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT roll_no, face_encoding FROM students WHERE face_encoding IS NOT NULL AND face_encoding != ''")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        print(json.dumps({"success": False, "message": f"DB Error: {str(e)}"}))
        sys.exit(1)

    for roll_no, face_b64 in rows:
        try:
            # Strip the data-URL prefix if present  (data:image/jpeg;base64,...)
            if "," in face_b64:
                face_b64 = face_b64.split(",", 1)[1]

            img_bytes = base64.b64decode(face_b64)
            img       = Image.open(BytesIO(img_bytes)).convert("RGB")
            img_array = np.array(img)

            encodings = face_recognition.face_encodings(img_array)
            if encodings:
                known_encodings.append(encodings[0])
                known_roll_nos.append(roll_no)
        except Exception:
            # Skip corrupted / unreadable photos silently
            continue

    return known_encodings, known_roll_nos


def scan_for_match(captured_image_path):
    # 1. Load & encode the captured photo
    try:
        unknown_image    = face_recognition.load_image_file(captured_image_path)
        unknown_encodings = face_recognition.face_encodings(unknown_image)

        if not unknown_encodings:
            return {"success": False, "message": "No face detected in the photo"}

        unknown_encoding = unknown_encodings[0]
    except Exception as e:
        return {"success": False, "message": f"Image load error: {str(e)}"}

    # 2. Load all registered students from the database
    known_encodings, known_roll_nos = load_known_faces_from_db()

    if not known_encodings:
        return {"success": False, "message": "No registered students found in database"}

    # 3. Compare — tolerance 0.5 is stricter than default 0.6
    matches  = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.5)
    distances = face_recognition.face_distance(known_encodings, unknown_encoding)

    if True in matches:
        # Pick the closest match if multiple faces somehow match
        best_idx = int(np.argmin(distances))
        if matches[best_idx]:
            return {"success": True, "roll_no": known_roll_nos[best_idx]}

    return {"success": False, "message": "Student not recognized"}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = scan_for_match(sys.argv[1])
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "message": "No image path provided"}))
