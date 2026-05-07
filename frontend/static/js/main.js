/* ── View Switching ───────────────────────────────────────── */
function switchView(viewName) {
  // Hide all views
  document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  
  // Show selected view
  const viewElement = document.getElementById(`view-${viewName}`);
  if (viewElement) {
    viewElement.style.display = 'block';
  }
  
  // Load history if viewing history
  if (viewName === 'history') {
    loadHistory();
  }
}

/* ── History Management ───────────────────────────────────── */
function saveToHistory(inputs, results) {
  if (!document.getElementById('history-enabled')?.checked) return;
  
  const history = JSON.parse(localStorage.getItem('predictionHistory') || '[]');
  const entry = {
    timestamp: new Date().toLocaleString(),
    inputs: inputs,
    results: results,
    id: Date.now()
  };
  
  history.unshift(entry);
  // Keep only last 50 predictions
  if (history.length > 50) history.pop();
  localStorage.setItem('predictionHistory', JSON.stringify(history));
}

function loadHistory() {
  const historyList = document.getElementById('history-list');
  const history = JSON.parse(localStorage.getItem('predictionHistory') || '[]');
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="result-placeholder">No predictions yet</div>';
    return;
  }
  
  historyList.innerHTML = history.map(entry => `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-item-time">${entry.timestamp}</span>
        <div class="history-item-result">
          <span class="history-item-prediction ${entry.results.best_result.prediction.toLowerCase()}">
            ${entry.results.best_result.prediction}
          </span>
          <span style="font-size: 12px; color: var(--muted);">${Math.round(entry.results.best_result.probability * 100)}%</span>
        </div>
      </div>
      <div class="history-item-inputs">
        Study: ${entry.inputs.study_hours} hrs | Attendance: ${entry.inputs.attendance}% | Marks: ${entry.inputs.previous_marks}
      </div>
      <div style="font-size: 11px; color: var(--faint); margin-top: 6px;">
        Best Model: ${entry.results.best_model}
      </div>
    </div>
  `).join('');
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all prediction history?')) {
    localStorage.removeItem('predictionHistory');
    loadHistory();
  }
}

/* ── Slider live display ──────────────────────────────────── */
const sliders = {
  "study-hours": { out: "sh-out", fmt: v => `${parseFloat(v).toFixed(1)} hrs` },
  "attendance": { out: "att-out", fmt: v => `${v} %` },
  "prev-marks": { out: "pm-out", fmt: v => `${v} / 100` },
};

Object.entries(sliders).forEach(([id, cfg]) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      document.getElementById(cfg.out).textContent = cfg.fmt(el.value);
    });
  }
});

/* ── Load model info on startup ───────────────────────────── */
async function loadModelInfo() {
  try {
    const res = await fetch("/api/model-info");
    if (!res.ok) throw new Error("Failed to load model info");

    const data = await res.json();

    console.log("Model Info:", data);

    renderModelCards(data.accuracies || {}, data.best_model || null);

    document.getElementById("best-pill").textContent =
      data.best_model
        ? `Best: ${data.best_model} · ${(data.accuracies[data.best_model] * 100).toFixed(1)}%`
        : "Models ready";

  } catch (err) {
    console.error(err);

    document.getElementById("best-pill").textContent = "Models ready";

    renderModelCards({
      "Logistic Regression": null,
      "Decision Tree": null,
      "Random Forest": null,
      "SVM": null,
    }, null);
  }
}

/* ── Render Model Cards ───────────────────────────────────── */
function renderModelCards(accuracies, bestName, results) {
  const grid = document.getElementById("model-grid");
  if (!grid) return;

  grid.innerHTML = "";

  Object.entries(accuracies).forEach(([name, acc]) => {
    const isBest = name === bestName;
    const pct = acc !== null ? (acc * 100).toFixed(1) + "%" : "—";
    const bar = acc !== null ? (acc * 100).toFixed(1) : 0;
    const pred = results ? results[name] : null;

    const card = document.createElement("div");
    card.className = "model-card" + (isBest ? " best" : "");

    card.innerHTML = `
      ${isBest ? '<span class="best-badge">Best model</span>' : ""}
      <div class="model-card-name">${name}</div>
      <div class="model-card-acc">${pct}</div>
      ${pred ? `<div style="font-size:12px;margin-bottom:6px;color:${pred.prediction === 'Pass' ? '#16a34a' : '#dc2626'};font-weight:600;">
        ${pred.prediction} · ${(pred.probability * 100).toFixed(0)}% pass prob
      </div>` : ""}
      <div class="acc-bar-bg">
        <div class="acc-bar" style="width:0%" data-target="${bar}%"></div>
      </div>`;

    grid.appendChild(card);
  });

  /* Animate bars */
  requestAnimationFrame(() => {
    document.querySelectorAll(".acc-bar[data-target]").forEach(bar => {
      setTimeout(() => {
        bar.style.width = bar.dataset.target;
      }, 80);
    });
  });
}

/* ── Predict ──────────────────────────────────────────────── */
async function predict() {
  const btn = document.getElementById("predict-btn");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Predicting...";

  const payload = {
    study_hours: parseFloat(document.getElementById("study-hours").value),
    attendance: parseFloat(document.getElementById("attendance").value),
    previous_marks: parseFloat(document.getElementById("prev-marks").value),
  };

  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Prediction API failed");

    const data = await res.json();

    console.log("Prediction Response:", data);

    if (!data.results || !data.best_model) {
      throw new Error("Invalid response format from server");
    }

    renderModelCards(
      Object.fromEntries(
        Object.entries(data.results).map(([k, v]) => [k, v.accuracy])
      ),
      data.best_model,
      data.results
    );

    document.getElementById("best-pill").textContent =
      `Best: ${data.best_model} · ${(data.results[data.best_model].accuracy * 100).toFixed(1)}%`;

    renderResult(data);

    // Save to history if auto-save is enabled
    if (document.getElementById('auto-save')?.checked) {
      saveToHistory(payload, data);
    }

  } catch (err) {
    console.error(err);

    document.getElementById("result-area").innerHTML =
      `<div class="result-placeholder" style="color:#dc2626;">
        Error: ${err.message}
      </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Predict performance";
  }
}

/* ── Render Result ────────────────────────────────────────── */
function renderResult(data) {
  const r = data.best_result;
  const pass = r.prediction === "Pass";
  const pct = Math.round(r.probability * 100);

  document.getElementById("result-area").innerHTML = `
    <div class="result-card">
      <div class="result-top">
        <div class="result-icon ${pass ? 'pass' : 'fail'}">${pass ? '✓' : '✕'}</div>
        <div>
          <div class="result-label">${pass ? 'Predicted to pass' : 'Predicted to fail'}</div>
          <div class="result-sub">Using ${data.best_model} · ${pct}% pass probability</div>
        </div>
      </div>

      <div class="prob-track">
        <div class="prob-fill" id="prob-fill"
          style="width:0%; background:${pass ? '#16a34a' : '#dc2626'}">
        </div>
      </div>

      <div class="prob-legend">
        <span>Fail</span>
        <span>${pct}%</span>
        <span>Pass</span>
      </div>
    </div>`;

  setTimeout(() => {
    const fill = document.getElementById("prob-fill");
    if (fill) fill.style.width = pct + "%";
  }, 60);
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  loadModelInfo();

  const btn = document.getElementById("predict-btn");
  if (btn) {
    btn.addEventListener("click", predict);
  }
  
  // Initialize settings from localStorage
  const historyEnabled = localStorage.getItem('history-enabled') !== 'false';
  const autoSave = localStorage.getItem('auto-save') !== 'false';
  
  const historyCheckbox = document.getElementById('history-enabled');
  const autoSaveCheckbox = document.getElementById('auto-save');
  
  if (historyCheckbox) {
    historyCheckbox.checked = historyEnabled;
    historyCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('history-enabled', e.target.checked);
    });
  }
  
  if (autoSaveCheckbox) {
    autoSaveCheckbox.checked = autoSave;
    autoSaveCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('auto-save', e.target.checked);
    });
  }
});