console.log("Photobooth loaded!");

const startBtn = document.getElementById("startBtn");
const popup = document.getElementById("popup");

startBtn.addEventListener("click", () => {

  popup.style.display = "flex";

});

const threeOption = document.getElementById("threeOption");
const fourOption = document.getElementById("fourOption");

threeOption.addEventListener("click", ()=>{

  localStorage.setItem("photoCount", 3);

  window.location.href = "camera.html";

});

fourOption.addEventListener("click", ()=>{

  localStorage.setItem("photoCount", 4);

  window.location.href = "camera.html";

});