const startDate = new Date("2024-11-10"); // Set November 10, 2024, as the fixed start date
const medicationCycle = 3; // Take medication every 3 days

function generateCalendar(month, year) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = ""; // Clear previous calendar

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
  startDate.setHours(0, 0, 0, 0); // Reset start date time for accurate calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill in the calendar days for the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";

    // Calculate medication days based on fixed start date
    const daysSinceStart = Math.floor(
      (date - startDate) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceStart >= 0 && daysSinceStart % medicationCycle === 0) {
      dayDiv.classList.add("medication-day");
    }

    // Highlight today's date separately
    if (date.getTime() === today.getTime()) {
      dayDiv.classList.add("today"); // Highlight today only
    }

    // Day of the week and date number
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateNumber = date.getDate();

    dayDiv.innerHTML = `<div class="day-name">${dayName}</div><div class="date-number">${dateNumber}</div>`;
    calendar.appendChild(dayDiv);
  }
}

// Generate current month calendar on load
const today = new Date();
generateCalendar(today.getMonth(), today.getFullYear());
