const startDate = new Date("2024-11-10");
const medicationCycle = 3;

function updateStats() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate medication days in current month
  let medicationDaysCount = 0;
  let takenCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const daysSinceStart = Math.floor(
      (date - startDate) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceStart >= 0 && daysSinceStart % medicationCycle === 0) {
      medicationDaysCount++;
      const dateString = date.toISOString().split("T")[0];
      if (localStorage.getItem(`medication_${dateString}`) === "taken") {
        takenCount++;
      }
    }
  }

  const adherenceRate =
    medicationDaysCount > 0
      ? Math.round((takenCount / medicationDaysCount) * 100)
      : 0;

  document.getElementById("adherenceRate").textContent = `${adherenceRate}%`;
  document.getElementById(
    "dosesCount"
  ).textContent = `${takenCount}/${medicationDaysCount}`;
}

function generateCalendar(month, year) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";

    const daysSinceStart = Math.floor(
      (date - startDate) / (24 * 60 * 60 * 1000)
    );
    const dateString = date.toISOString().split("T")[0];
    const isMedicationTaken =
      localStorage.getItem(`medication_${dateString}`) === "taken";

    if (daysSinceStart >= 0 && daysSinceStart % medicationCycle === 0) {
      dayDiv.classList.add("medication-day");
      if (isMedicationTaken) {
        dayDiv.classList.add("medication-taken");
      }
    }

    if (date.getTime() === today.getTime()) {
      dayDiv.classList.add("today");
    }

    const dayName = date.toLocaleDateString("en-US", {
      weekday: "short",
    });
    const dateNumber = date.getDate();

    dayDiv.innerHTML = `
                    <div class="day-name">${dayName}</div>
                    <div class="date-number">${dateNumber}</div>
                    <button class="check-button">Take</button>
                    <div class="taken-text">✓ Taken</div>
                `;

    const checkButton = dayDiv.querySelector(".check-button");
    if (checkButton) {
      checkButton.addEventListener("click", () => {
        localStorage.setItem(`medication_${dateString}`, "taken");
        dayDiv.classList.add("medication-taken");
        updateStats();
      });
    }

    calendar.appendChild(dayDiv);
  }
  updateStats();
}

const today = new Date();
generateCalendar(today.getMonth(), today.getFullYear());
