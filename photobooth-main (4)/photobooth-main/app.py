from flask import Flask, send_from_directory, request, jsonify
import base64, os
from datetime import datetime

app = Flask(__name__, static_folder=".", static_url_path="")
STRIPS_DIR = "strips"
os.makedirs(STRIPS_DIR, exist_ok=True)

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route("/camera.html")
def camera():
    return send_from_directory(".", "camera.html")

@app.route("/save", methods=["POST"])
def save_strip():
    data = request.json["image"]
    header, encoded = data.split(",", 1)
    img_bytes = base64.b64decode(encoded)

    # Use the filename the client already generated (so it matches the QR code
    # that was baked into the image), falling back to a timestamp if missing.
    filename = request.json.get("filename") or f"strip-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png"

    with open(os.path.join(STRIPS_DIR, filename), "wb") as f:
        f.write(img_bytes)

    file_url = request.host_url.rstrip("/") + f"/download/{filename}"
    return jsonify({"status": "ok", "filename": filename, "url": file_url})

@app.route("/gallery")
def gallery():
    files = sorted(os.listdir(STRIPS_DIR), reverse=True)
    imgs = "".join(f'<img src="/strips/{f}" style="width:200px;margin:8px;">' for f in files)
    return f"<body style='background:#111'>{imgs}</body>"

@app.route("/strips/<path:filename>")
def get_strip(filename):
    return send_from_directory(STRIPS_DIR, filename)

@app.route("/download/<path:filename>")
def download_strip(filename):
    # Forces the phone browser to actually download the file instead of just viewing it
    return send_from_directory(STRIPS_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000,
        ssl_context=("192.168.137.1+2.pem", "192.168.137.1+2-key.pem"))