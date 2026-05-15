import face_recognition
import sys
import os
import json

def scan_for_match(captured_image_path):
    # 1. Load the photo sent from the phone
    try:
        # Load image and find encodings
        unknown_image = face_recognition.load_image_file(captured_image_path)
        unknown_encodings = face_recognition.face_encodings(unknown_image)
        
        if len(unknown_encodings) == 0:
            return {"success": False, "message": "No face detected in capture"}
        
        unknown_encoding = unknown_encodings[0]
    except Exception as e:
        return {"success": False, "message": f"Image Load Error: {str(e)}"}

    # 2. Look through the 'known_students' folder
    # Use absolute path to ensure the script finds the folder regardless of where it's called from
    base_dir = os.path.dirname(os.path.abspath(__file__))
    known_folder = os.path.join(base_dir, "known_students")
    
    if not os.path.exists(known_folder):
        return {"success": False, "message": "Folder 'known_students' not found"}

    try:
        for filename in os.listdir(known_folder):
            if filename.lower().endswith((".jpg", ".png", ".jpeg")):
                known_path = os.path.join(known_folder, filename)
                
                # Load the reference photo
                known_image = face_recognition.load_image_file(known_path)
                known_encodings = face_recognition.face_encodings(known_image)

                # Skip files in known_students that don't have a clear face
                if len(known_encodings) == 0:
                    continue

                known_encoding = known_encodings[0]

                # 3. Compare the two faces
                # Tolerance 0.5 is slightly stricter (more accurate) than 0.6
                results = face_recognition.compare_faces([known_encoding], unknown_encoding, tolerance=0.5)

                if results[0]:
                    # Match found! Return the roll number (filename minus extension)
                    roll_no = os.path.splitext(filename)[0]
                    return {"success": True, "roll_no": roll_no}

    except Exception as e:
        return {"success": False, "message": f"Processing Error: {str(e)}"}

    return {"success": False, "message": "Student not recognized"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # sys.argv[1] is the image path passed from Node.js
        result = scan_for_match(sys.argv[1])
        # Force print only the JSON to avoid parsing errors in Node.js
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "message": "No image path provided"}))