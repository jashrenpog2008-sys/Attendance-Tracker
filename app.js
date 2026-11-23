let roster = [];
try {
  const savedRoster = JSON.parse(localStorage.getItem("attendanceRoster"));
  roster = Array.isArray(savedRoster) ? savedRoster : [...DEFAULT_ROSTER];
} catch (e) {
  roster = [...DEFAULT_ROSTER];
}

function saveRoster() {
  roster.sort((a, b) => a.lastName.localeCompare(b.lastName));
  localStorage.setItem("attendanceRoster", JSON.stringify(roster));
}

// 2. SESSION DATA & STORAGE
let session = {
  subject: "Math 101",
  profArrivedAt: null,
  isClosed: false,
  records: {}
};

try {
  const savedSession = JSON.parse(localStorage.getItem("attendanceSession"));
  if (savedSession && typeof savedSession === "object") {
    session = {
      subject: savedSession.subject || "Math 101",
      profArrivedAt: savedSession.profArrivedAt || null,
      isClosed: Boolean(savedSession.isClosed),
      records: savedSession.records && typeof savedSession.records === "object" ? savedSession.records : {}
    };
  }
} catch (e) {
  // Keeps default fresh session if localStorage was corrupted
}

function saveSession() {
  localStorage.setItem("attendanceSession", JSON.stringify(session));
}

function updateSubject() {
  const input = document.getElementById("subjectInput");
  if (!input) return;
  session.subject = input.value.trim() || "Untitled Subject";
  saveSession();
}

// 3. TIME & DATE UTILITIES
function getFormattedTime(dateObj = new Date()) {
  return dateObj.toTimeString().split(" ")[0];
}

function getFormattedDate(dateObj = new Date()) {
  return dateObj.toISOString().split("T")[0];
}

setInterval(() => {
  const clock = document.getElementById("clockDisplay");
  if (clock) clock.textContent = `Date: ${getFormattedDate()} | Current Time: ${getFormattedTime()}`;
}, 1000);

// 4. RECORDER SECURITY GATE
function unlockRecorder() {
  const pinInput = document.getElementById("pinInput");
  const pin = pinInput ? pinInput.value.trim() : "";

  if (pin === "1234") {
    const loginSection = document.getElementById("loginSection");
    const dashboard = document.getElementById("recorderDashboard");

    loginSection.classList.add("hidden");
    loginSection.style.display = "none";

    dashboard.classList.remove("hidden");
    dashboard.style.display = "block";

    const subjectInput = document.getElementById("subjectInput");
    if (subjectInput) subjectInput.value = session.subject || "Math 101";

    const lastNameInput = document.getElementById("lastNameInput");
    if (lastNameInput && !session.isClosed) lastNameInput.focus();

    updateRecorderUI();
  } else {
    alert("Incorrect PIN. Enter 1234.");
  }
}

const pinInput = document.getElementById("pinInput");
if (pinInput) {
  pinInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") unlockRecorder();
  });
}

// 5. CORE CLASS STATE CONTROLS
function markProfArrived() {
  if (session.isClosed) return;
  session.profArrivedAt = getFormattedTime();
  saveSession();
  updateRecorderUI();
  document.getElementById("lastNameInput").focus();
}

function endClass() {
  if (session.isClosed) return;
  if (!confirm("End class now? Anyone not yet recorded will be marked ABSENT.")) return;

  roster.forEach(student => {
    if (!session.records[student.id]) {
      session.records[student.id] = {
        status: "Absent",
        time: "--:--:--"
      };
    }
  });

  session.isClosed = true;
  saveSession();
  updateRecorderUI();
}

function resetDemo() {
  const keptSubject = session.subject || "Math 101";
  localStorage.setItem("attendanceSession", JSON.stringify({
    subject: keptSubject,
    profArrivedAt: null,
    isClosed: false,
    records: {}
  }));
  location.reload();
}

// Add this function right below resetDemo() in Section 5 of app.js:
function clearAllStudents() {
  if (!confirm("Delete ALL students from the roster and clear current attendance records?")) return;
  roster = [];
  localStorage.setItem("attendanceRoster", JSON.stringify([]));
  session.records = {};
  session.profArrivedAt = null;
  session.isClosed = false;
  saveSession();
  updateRecorderUI();
}

// 6A. SINGLE ADD STUDENT PANEL
function openAddStudentPanel(prefillLastName = "") {
  if (session.isClosed) {
    alert("Session is closed. Click 'Reset Session' first.");
    return;
  }
  closeMassAddPanel(false);

  const panel = document.getElementById("addStudentPanel");
  const lastInput = document.getElementById("newLastName");
  const firstInput = document.getElementById("newFirstName");

  panel.classList.remove("hidden");
  panel.style.display = "block";

  if (prefillLastName) {
    lastInput.value = prefillLastName.charAt(0).toUpperCase() + prefillLastName.slice(1);
    firstInput.focus();
  } else {
    lastInput.focus();
  }
}

function closeAddStudentPanel(refocusMain = true) {
  const panel = document.getElementById("addStudentPanel");
  if (!panel) return;
  panel.classList.add("hidden");
  panel.style.display = "none";

  document.getElementById("newStudentId").value = "";
  document.getElementById("newLastName").value = "";
  document.getElementById("newFirstName").value = "";
  if (refocusMain && !session.isClosed) document.getElementById("lastNameInput").focus();
}

function toggleAddStudentPanel(prefillLastName = "") {
  const panel = document.getElementById("addStudentPanel");
  const isHidden = panel.classList.contains("hidden") || panel.style.display === "none";
  if (isHidden) openAddStudentPanel(prefillLastName);
  else closeAddStudentPanel();
}

function addNewStudent() {
  if (session.isClosed) return;

  const idInput = document.getElementById("newStudentId").value.trim();
  const lastName = document.getElementById("newLastName").value.trim();
  const firstName = document.getElementById("newFirstName").value.trim();

  if (!lastName || !firstName) {
    alert("Please enter both Last Name and First Name.");
    return;
  }

  const studentId = idInput || `TEMP-${String(roster.length + 1).padStart(3, "0")}`;

  if (roster.some(s => s.id.toLowerCase() === studentId.toLowerCase())) {
    alert(`Student ID "${studentId}" already exists in the roster.`);
    return;
  }

  const newStudent = { id: studentId, lastName, firstName };
  roster.push(newStudent);
  saveRoster();

  closeAddStudentPanel();
  logStudent(newStudent);
}

["newStudentId", "newLastName", "newFirstName"].forEach(fieldId => {
  const field = document.getElementById(fieldId);
  if (field) {
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addNewStudent();
      }
    });
  }
});

// 6B. MASS ADD STUDENTS PANEL
function openMassAddPanel() {
  closeAddStudentPanel(false);
  const panel = document.getElementById("massAddPanel");
  panel.classList.remove("hidden");
  panel.style.display = "block";
  document.getElementById("massStudentInput").focus();
}

function closeMassAddPanel(refocusMain = true) {
  const panel = document.getElementById("massAddPanel");
  if (!panel) return;
  panel.classList.add("hidden");
  panel.style.display = "none";
  document.getElementById("massStudentInput").value = "";
  document.getElementById("replaceRosterCheck").checked = false;
  if (refocusMain && !session.isClosed) document.getElementById("lastNameInput").focus();
}

function toggleMassAddPanel() {
  const panel = document.getElementById("massAddPanel");
  const isHidden = panel.classList.contains("hidden") || panel.style.display === "none";
  if (isHidden) openMassAddPanel();
  else closeMassAddPanel();
}

function massAddStudents() {
  const rawText = document.getElementById("massStudentInput").value.trim();
  const replaceExisting = document.getElementById("replaceRosterCheck").checked;

  if (!rawText) {
    alert("Please paste at least one student line first.");
    return;
  }

  if (replaceExisting) {
    roster = [];
  }

  const lines = rawText.split(/\r?\n/);
  let addedCount = 0;
  let skippedCount = 0;

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    const parts = cleanLine.includes("\t")
      ? cleanLine.split("\t").map(p => p.trim())
      : cleanLine.split(",").map(p => p.trim());

    const firstLower = (parts[0] || "").toLowerCase();
    if (firstLower === "student id" || firstLower === "id" || firstLower === "last name") {
      return;
    }

    let studentId = "";
    let lastName = "";
    let firstName = "";

    if (parts.length >= 3) {
      studentId = parts[0];
      lastName = parts[1];
      firstName = parts[2];
    } else if (parts.length === 2) {
      lastName = parts[0];
      firstName = parts[1];
      studentId = `STU-${String(roster.length + addedCount + 1).padStart(3, "0")}`;
    } else {
      skippedCount++;
      return;
    }

    if (!lastName || !firstName) {
      skippedCount++;
      return;
    }

    if (roster.some(s => s.id.toLowerCase() === studentId.toLowerCase())) {
      skippedCount++;
      return;
    }

    roster.push({ id: studentId, lastName, firstName });
    addedCount++;
  });

  if (roster.length === 0) {
    roster = [...DEFAULT_ROSTER];
  }

  saveRoster();
  closeMassAddPanel();
  updateRecorderUI();

  alert(`Import complete: ${addedCount} student(s) added.${skippedCount > 0 ? ` (${skippedCount} invalid/duplicate line(s) skipped)` : ""}`);
}

// 7. FAST LAST-NAME AUTOCOMPLETE & ENTER-TO-LOG LOGIC
const lastNameInput = document.getElementById("lastNameInput");
const autocompleteList = document.getElementById("autocompleteList");
let currentMatches = [];

if (lastNameInput) {
  lastNameInput.addEventListener("input", () => {
    const rawQuery = lastNameInput.value.trim();
    const query = rawQuery.toLowerCase();
    autocompleteList.innerHTML = "";
    currentMatches = [];

    if (!query || session.isClosed) {
      autocompleteList.classList.add("hidden");
      return;
    }

    // Prioritize Last Name startsWith, then fallback to partial match on Last Name, First Name, or ID
    const exactStart = roster.filter(s => s.lastName.toLowerCase().startsWith(query));
    const partialMatch = roster.filter(s =>
      !s.lastName.toLowerCase().startsWith(query) &&
      (s.lastName.toLowerCase().includes(query) ||
       s.firstName.toLowerCase().includes(query) ||
       s.id.toLowerCase().includes(query))
    );
    currentMatches = [...exactStart, ...partialMatch];

    autocompleteList.classList.remove("hidden");

    if (currentMatches.length > 0) {
      currentMatches.forEach((student, index) => {
        const div = document.createElement("div");
        div.className = "autocomplete-item" + (index === 0 ? " active" : "");
        const alreadyLogged = session.records[student.id] ? ` [${session.records[student.id].status}]` : "";
        div.textContent = `${student.lastName}, ${student.firstName} (${student.id})${alreadyLogged}`;
        div.onmousedown = (e) => {
          e.preventDefault();
          logStudent(student);
        };
        autocompleteList.appendChild(div);
      });
    } else {
      const addPrompt = document.createElement("div");
      addPrompt.className = "autocomplete-item active";
      addPrompt.textContent = `+ "${rawQuery}" not found — Click or press Enter to add student`;
      addPrompt.onmousedown = (e) => {
        e.preventDefault();
        autocompleteList.classList.add("hidden");
        openAddStudentPanel(rawQuery);
      };
      autocompleteList.appendChild(addPrompt);
    }
  });

  lastNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const rawQuery = lastNameInput.value.trim();
      if (currentMatches.length > 0) {
        logStudent(currentMatches[0]);
      } else if (rawQuery) {
        autocompleteList.classList.add("hidden");
        openAddStudentPanel(rawQuery);
      }
    }
  });
}

// 8. RECORDING A STUDENT'S ATTENDANCE
function showLogFeedback(message) {
  let banner = document.getElementById("logFeedbackBanner");
  if (!banner && lastNameInput) {
    banner = document.createElement("div");
    banner.id = "logFeedbackBanner";
    banner.style.cssText = "color: #4ade80; font-size: 0.9rem; font-weight: 600; margin-top: 6px;";
    lastNameInput.parentNode.appendChild(banner);
  }
  if (banner) {
    banner.textContent = message;
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => { banner.textContent = ""; }, 3000);
  }
}

function logStudent(student) {
  if (!student || session.isClosed) return;

  const nowTime = getFormattedTime();
  const status = session.profArrivedAt === null ? "Present" : "Late";

  session.records[student.id] = {
    status: status,
    time: nowTime
  };

  saveSession();
  if (lastNameInput) {
    lastNameInput.value = "";
    lastNameInput.focus();
  }
  if (autocompleteList) {
    autocompleteList.classList.add("hidden");
  }
  currentMatches = [];
  updateRecorderUI();
  showLogFeedback(`✓ Logged ${student.lastName}, ${student.firstName} — ${status} (${nowTime})`);
}

// 9. EXPORT TO .TXT AND .PDF
function buildReportData() {
  const subjectName = session.subject || "Untitled Subject";
  const dateStr = getFormattedDate();
  const profTime = session.profArrivedAt || "Not marked / Grace Window";

  let present = 0, late = 0, absent = 0, pending = 0;

  const rows = roster.map(student => {
    const rec = session.records[student.id];
    const status = rec ? rec.status : "Pending";
    const time = rec ? rec.time : "--:--:--";

    if (status === "Present") present++;
    else if (status === "Late") late++;
    else if (status === "Absent") absent++;
    else pending++;

    return {
      id: student.id,
      name: `${student.lastName}, ${student.firstName}`,
      status,
      time
    };
  });

  return { subjectName, dateStr, profTime, present, late, absent, pending, rows };
}

function exportToTxt() {
  const data = buildReportData();
  const safeSubject = data.subjectName.replace(/[^a-z0-9]/gi, "_");

  let lines = [
    "================================================================",
    `ATTENDANCE REPORT — ${data.subjectName.toUpperCase()}`,
    "================================================================",
    `Date:              ${data.dateStr}`,
    `Prof Arrival Time: ${data.profTime}`,
    `Total Roster:      ${roster.length}`,
    `Summary:           Present: ${data.present} | Late: ${data.late} | Absent: ${data.absent} | Pending: ${data.pending}`,
    "----------------------------------------------------------------",
    "STUDENT ID     | LAST NAME, FIRST NAME         | STATUS  | TIME",
    "----------------------------------------------------------------"
  ];

  data.rows.forEach(r => {
    const colId = r.id.padEnd(14, " ");
    const colName = r.name.padEnd(29, " ");
    const colStatus = r.status.padEnd(7, " ");
    lines.push(`${colId} | ${colName} | ${colStatus} | ${r.time}`);
  });

  lines.push("================================================================");

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Attendance_${safeSubject}_${data.dateStr}.txt`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

function exportToPdf() {
  const data = buildReportData();
  const safeSubject = data.subjectName.replace(/[^a-z0-9]/gi, "_");

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library not loaded");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance Report: ${data.subjectName}`, 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${data.dateStr}   |   Prof Arrival: ${data.profTime}`, 14, 26);
    doc.text(`Total: ${roster.length}   |   Present: ${data.present}   |   Late: ${data.late}   |   Absent: ${data.absent}`, 14, 32);

    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: 38,
        head: [["Student ID", "Last Name, First Name", "Status", "Time Logged"]],
        body: data.rows.map(r => [r.id, r.name, r.status, r.time]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9.5 }
      });
    } else {
      let y = 42;
      data.rows.forEach(r => {
        doc.text(`${r.id}  |  ${r.name}  |  ${r.status}  |  ${r.time}`, 14, y);
        y += 7;
      });
    }

    doc.save(`Attendance_${safeSubject}_${data.dateStr}.pdf`);
  } catch (err) {
    console.warn("PDF generation fallback triggered:", err);
    alert("Direct PDF library unavailable offline — opening Print / Save as PDF dialog instead.");
    window.print();
  }
}

// 10. UI RENDERERS
function updateRecorderUI() {
  const badge = document.getElementById("sessionStatusBadge");
  const profBtn = document.getElementById("profArrivedBtn");
  const endBtn = document.getElementById("endClassBtn");
  const addBtn = document.getElementById("toggleAddBtn");
  const tbody = document.getElementById("attendanceTableBody");
  const summaryBar = document.getElementById("summaryBar");

  if (!tbody) return;

  if (session.isClosed) {
    badge.textContent = "Class Ended (Locked)";
    badge.className = "badge badge-closed";
    profBtn.disabled = true;
    endBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    if (lastNameInput) lastNameInput.disabled = true;
  } else if (session.profArrivedAt !== null) {
    badge.textContent = `Prof Arrived at ${session.profArrivedAt} (Recording LATE)`;
    badge.className = "badge badge-active";
    profBtn.disabled = true;
  }

  const data = buildReportData();
  if (summaryBar) {
    summaryBar.innerHTML = `
      <span>Roster: <strong>${roster.length}</strong></span>
      <span class="status-present">Present: ${data.present}</span>
      <span class="status-late">Late: ${data.late}</span>
      <span class="status-absent">Absent: ${data.absent}</span>
    `;
  }

  tbody.innerHTML = "";
  roster.forEach(student => {
    const rec = session.records[student.id];
    if (rec) {
      const statusClass = `status-${rec.status.toLowerCase()}`;
      tbody.innerHTML += `
        <tr>
          <td>${student.id}</td>
          <td><strong>${student.lastName}</strong>, ${student.firstName}</td>
          <td class="${statusClass}">${rec.status}</td>
          <td>${rec.time}</td>
        </tr>
      `;
    }
  });
}

function renderStudentPortal() {
  const tbody = document.getElementById("studentPortalBody");
  if (!tbody) return;

  const subjectTitle = document.getElementById("studentPortalSubject");
  if (subjectTitle) {
    subjectTitle.textContent = `${session.subject || "Math 101"} — Attendance Monitor`;
  }

  const data = buildReportData();
  const studentSummaryBar = document.getElementById("studentSummaryBar");
  if (studentSummaryBar) {
    studentSummaryBar.innerHTML = `
      <span>Total Students: <strong>${roster.length}</strong></span>
      <span class="status-present">Present: ${data.present}</span>
      <span class="status-late">Late: ${data.late}</span>
      <span class="status-absent">Absent: ${data.absent}</span>
    `;
  }

  const filter = (document.getElementById("studentSearchInput")?.value || "").toLowerCase();
  tbody.innerHTML = "";

  roster.forEach(student => {
    const fullName = `${student.lastName}, ${student.firstName}`.toLowerCase();
    if (fullName.includes(filter) || student.id.toLowerCase().includes(filter)) {
      const rec = session.records[student.id];
      const status = rec ? rec.status : "Pending";
      const time = rec ? rec.time : "--:--:--";
      const statusClass = rec ? `status-${rec.status.toLowerCase()}` : "";

      tbody.innerHTML += `
        <tr>
          <td>${student.id}</td>
          <td>${student.lastName}, ${student.firstName}</td>
          <td class="${statusClass}">${status}</td>
          <td>${time}</td>
        </tr>
      `;
    }
  });
}

renderStudentPortal();