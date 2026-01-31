// Update date and time every second
function updateDateTime() {
  const now = new Date();
  const options = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const formattedDateTime = now
    .toLocaleDateString("en-GB", options)
    .replace(",", " |");
  document.getElementById("currentDateTime").textContent = formattedDateTime;
}

// Update immediately and then every second
updateDateTime();
setInterval(updateDateTime, 1000);
