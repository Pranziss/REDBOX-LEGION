console.log("SCRIPT VERSION 5 LOADED");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const strip = document.getElementById("strip");
const retakeBtn = document.getElementById("retakeBtn");
const countdown = document.getElementById("countdown");
const uploadInput = document.getElementById("uploadInput");
const saveBtn = document.getElementById("saveBtn");
const designSelect = document.getElementById("designSelect");
const cameraSelect = document.getElementById("cameraSelect");

// Tune these if bars aren't fully cropped (increase) or too much is cut (decrease)
const CROP_TOP_PERCENT = 0.15;
const CROP_BOTTOM_PERCENT = 0.15;

// Parse the localStorage value into a base-10 number. Fallback to 4 if not found.
let maxPhotos = parseInt(localStorage.getItem("photoCount"), 10) || 4;
let takenPhotos = 0;

// Track if a countdown sequence is already running anywhere
let isCapturing = false;

if (maxPhotos === 3) {
  strip.classList.add("three");
} else {
  strip.classList.add("four");
}

let streamStarted = false;
let currentStream = null;

// LIST AVAILABLE CAMERAS
async function getCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(d => d.kind === "videoinput");

  cameraSelect.innerHTML = "";
  videoDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || `Camera ${index + 1}`;
    cameraSelect.appendChild(option);
  });
}

// START CAMERA (optionally with a specific deviceId)
async function startCamera(deviceId = null) {
  try {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    video.srcObject = stream;

    // Log which camera is actually feeding the video, for debugging
    const track = stream.getVideoTracks()[0];
    console.log("Active camera:", track.label);

    video.onloadedmetadata = () => {
      video.play();
      streamStarted = true;
    };

  } catch (error) {
    console.error("Camera error: ", error);
    alert("Couldn't switch to that camera: " + error.message);
  }
}

// SWITCH CAMERA WHEN DROPDOWN CHANGES
cameraSelect.addEventListener("change", () => {
  startCamera(cameraSelect.value);
});

// INITIALIZE APPLICATION
async function init() {
  createSlots();

  // Request permission first so device labels aren't blank
  await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    stream.getTracks().forEach(track => track.stop());
  });

  await getCameras();
  startCamera(cameraSelect.value);
}

init();

// CREATE SLOTS & ADD INDIVIDUAL CLICK LISTENERS FOR SINGLE RETAKES
function createSlots() {
  strip.innerHTML = "";
  for (let i = 0; i < maxPhotos; i++) {
    const slot = document.createElement("div");
    slot.classList.add("photo-slot");
    slot.dataset.index = i; // Save the position index on the slot

    // Smooth interaction styling hint
    slot.style.cursor = "pointer";
    slot.title = "Click this frame to retake this specific photo!";

    // Listen for single photo retake clicks
    slot.addEventListener("click", () => {
      // Don't interrupt if another countdown sequence is actively capturing
      if (isCapturing) return;

      // Only allow retaking if an image actually exists inside this slot
      if (slot.querySelector("img")) {
        retakeSinglePhoto(slot);
      }
    });

    strip.appendChild(slot);
  }
}

// SINGLE PHOTO RETAKE LOGIC
function retakeSinglePhoto(targetSlot) {
  if (!streamStarted) {
    alert("The camera is still loading. Please wait.");
    return;
  }

  isCapturing = true; // Lock down controls
  targetSlot.style.opacity = "0.5";

  let timeLeft = 3;
  countdown.innerText = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;

    if (timeLeft > 0) {
      countdown.innerText = timeLeft;
    } else {
      clearInterval(timer);
      countdown.innerText = "";
      targetSlot.style.opacity = "1"; // Reset visibility

      const context = canvas.getContext("2d");
      const sx = 0;
      const sy = video.videoHeight * CROP_TOP_PERCENT;
      const sWidth = video.videoWidth;
      const sHeight = video.videoHeight * (1 - CROP_TOP_PERCENT - CROP_BOTTOM_PERCENT);

      canvas.width = sWidth;
      canvas.height = sHeight;

      context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const imageData = canvas.toDataURL("image/png");

      // Wipe the old image inside this slot clean
      targetSlot.innerHTML = "";

      // Append the fresh replacement photo
      const newPhoto = document.createElement("img");
      newPhoto.src = imageData;
      targetSlot.appendChild(newPhoto);

      isCapturing = false; // Unlock controls when done!
    }
  }, 1000);
}

// UPLOAD IMAGE
uploadInput.addEventListener("change", () => {
  if (isCapturing) return;

  const file = uploadInput.files[0];
  if (!file) return;

  if (takenPhotos >= maxPhotos) {
    alert("Slots are full! Click Retake to start over or click a frame directly to replace it.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const photo = document.createElement("img");
    photo.src = e.target.result;

    const slots = document.querySelectorAll(".photo-slot");
    if (slots[takenPhotos]) {
      slots[takenPhotos].appendChild(photo);
      takenPhotos++;
    }
  };
  reader.readAsDataURL(file);
});

// TAKE PHOTO (GLOBAL SEQUENCE)
captureBtn.addEventListener("click", () => {
  if (!streamStarted) {
    alert("The camera is still loading or access was denied. Please check your browser permissions.");
    return;
  }

  if (takenPhotos >= maxPhotos) {
    alert("Slots are full! Click Retake to start over or click a frame directly to replace it.");
    return;
  }

  // If a sequence is already running, ignore additional inputs completely!
  if (isCapturing) return;

  isCapturing = true;
  captureBtn.disabled = true;
  captureBtn.style.opacity = "0.5";

  let timeLeft = 3;
  countdown.innerText = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;

    if (timeLeft > 0) {
      countdown.innerText = timeLeft;
    } else {
      clearInterval(timer);
      countdown.innerText = "";

      const context = canvas.getContext("2d");
      const sx = 0;
      const sy = video.videoHeight * CROP_TOP_PERCENT;
      const sWidth = video.videoWidth;
      const sHeight = video.videoHeight * (1 - CROP_TOP_PERCENT - CROP_BOTTOM_PERCENT);

      canvas.width = sWidth;
      canvas.height = sHeight;

      context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const imageData = canvas.toDataURL("image/png");
      const photo = document.createElement("img");
      photo.src = imageData;

      const slots = document.querySelectorAll(".photo-slot");
      if (slots[takenPhotos]) {
        slots[takenPhotos].appendChild(photo);
        takenPhotos++;
      }

      // Unlock everything so you can click again
      isCapturing = false;
      captureBtn.disabled = false;
      captureBtn.style.opacity = "1";
    }
  }, 1000);
});

// RESET ALL PHOTOS
retakeBtn.addEventListener("click", () => {
  if (isCapturing) return;
  takenPhotos = 0;
  createSlots();
});

// SAVE PHOTO STRIP AT TRUE 2x6 INCH PRINT SIZE (300 DPI) + QR CODE
saveBtn.addEventListener("click", () => {
  if (isCapturing) return;

  const images = document.querySelectorAll(".photo-slot img");

  if (images.length === 0) {
    alert("Take some photos first before saving your strip!");
    return;
  }

  // --- TRUE 2x6 INCH PRINT SIZE AT 300 DPI ---
  const canvasWidth = 600;   // 2 inches * 300 DPI
  const canvasHeight = 1800; // 6 inches * 300 DPI
  const numPhotos = images.length;

  // Each design template has its own exact window layout, measured from the PNG itself.
  const stripLayouts = {
    classic: {
      slotWidth: 500,
      topMargin: 70,
      bottomMargin: 70,
      verticalGap: 30,
      qrBox: { x: 250, y: canvasHeight - 60, size: 50 }
    },
    "images/strip6.png": {
      slotWidth: 529,
      sidePaddingOverride: 36,  // measured directly from the PNG, not perfectly centered math
      slotHeightOverride: 363,  // measured directly from the PNG windows
      topMargin: 38,
      bottomMargin: 203,
      verticalGap: 35,
      qrBox: { x: 510, y: 1715, size: 60 } // adjust x/y if it overlaps the logo art
    }
    // Add "images/design1.png" here too once its real window positions AND a qrBox
    // are measured, using the same pattern as "images/strip6.png" above.
  };

  const selectedDesign = designSelect ? designSelect.value : "classic";
  const layout = stripLayouts[selectedDesign] || stripLayouts.classic;

  const slotWidth = layout.slotWidth;
  const sidePadding = layout.sidePaddingOverride ?? (canvasWidth - slotWidth) / 2;
  const verticalGap = layout.verticalGap;
  const topMargin = layout.topMargin;
  const bottomMargin = layout.bottomMargin;

  // Use the exact measured height if given, otherwise calculate evenly
  const slotHeight = layout.slotHeightOverride ?? (() => {
    const totalGapSpace = verticalGap * (numPhotos - 1);
    const availableHeight = canvasHeight - topMargin - bottomMargin - totalGapSpace;
    return availableHeight / numPhotos;
  })();

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = canvasWidth;
  finalCanvas.height = canvasHeight;
  const ctx = finalCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const artOverlay = new Image();
  if (selectedDesign !== "classic") {
    artOverlay.src = selectedDesign;
  }

  // Generate a stable filename NOW so the QR code and the actual saved file always match
  const filename = `strip-${Date.now()}.png`;
  const downloadURL = `${window.location.origin}/download/${filename}`;

  const renderStripLayout = () => {
    let loadedCount = 0;

    images.forEach((imgElement, index) => {
      const photoImg = new Image();
      photoImg.src = imgElement.src;

      photoImg.onload = () => {
        // Shared universal math logic loop
        const yOffset = topMargin + (index * (slotHeight + verticalGap));

        ctx.drawImage(photoImg, sidePadding, yOffset, slotWidth, slotHeight);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.strokeRect(sidePadding, yOffset, slotWidth, slotHeight);

        loadedCount++;

        if (loadedCount === images.length) {
          if (selectedDesign !== "classic") {
            ctx.drawImage(artOverlay, 0, 0, canvasWidth, canvasHeight);
          }
          drawQrThenFinish();
        }
      };
    });
  };

  const drawQrThenFinish = () => {
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, downloadURL, { width: layout.qrBox.size, margin: 0 }, (err) => {
      if (err) {
        console.error("QR generation failed:", err);
        finishAndUpload(); // still save/download even if QR fails
        return;
      }
      // White backing behind the QR so it's scannable even on dark backgrounds
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(layout.qrBox.x - 4, layout.qrBox.y - 4, layout.qrBox.size + 8, layout.qrBox.size + 8);
      ctx.drawImage(qrCanvas, layout.qrBox.x, layout.qrBox.y, layout.qrBox.size, layout.qrBox.size);
      finishAndUpload();
    });
  };

  const finishAndUpload = () => {
    const stripImageURL = finalCanvas.toDataURL("image/png");

    // Upload to Flask, sending the SAME filename the QR already points to
    fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: stripImageURL, filename: filename })
    }).catch(err => console.warn("Upload failed:", err));

    const downloadLink = document.createElement("a");
    downloadLink.href = stripImageURL;
    downloadLink.download = filename;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (selectedDesign !== "classic") {
    artOverlay.onload = renderStripLayout;
    artOverlay.onerror = () => {
      console.warn(`Could not locate your image file named "${selectedDesign}"! Saving raw layout instead.`);
      renderStripLayout();
    };
  } else {
    renderStripLayout();
  }
});