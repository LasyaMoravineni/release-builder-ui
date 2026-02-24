/* ================================================================
   RELEASE TAGS 
================================================================ */

/* ------------------------------------------------
   Wizard Navigation
------------------------------------------------ */
let currentStep = 1;
const totalSteps = 3;

function showStep(step) {
    document.querySelectorAll(".step-panel").forEach(p => p.classList.remove("active"));
    const panel = document.getElementById("step" + step);
    if (panel) panel.classList.add("active");

    document.querySelectorAll("#stepNav li").forEach(li => li.classList.remove("active"));
    const navItem = document.querySelector(`#stepNav li[data-step="${step}"]`);
    if (navItem) navItem.classList.add("active");

    document.getElementById("backBtn").style.visibility = step === 1 ? "hidden" : "visible";

    const nextBtn = document.getElementById("nextBtn");
    if (step === totalSteps) {
        nextBtn.style.display = "none";
    } else {
        nextBtn.style.display = "inline-block";
        nextBtn.textContent = "Next";
    }

    if (step === 3) buildJSON();
}

showStep(currentStep);

/* Sidebar Navigation */
document.querySelectorAll("#stepNav li").forEach(li => {
    li.onclick = () => {
        currentStep = Number(li.dataset.step);
        showStep(currentStep);
    };
});

/* Back / Next Buttons */
document.getElementById("backBtn").onclick = () => {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
};

document.getElementById("nextBtn").onclick = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
};


/* ================================================================
   STEP 1 — Release Information
================================================================ */

function requireField(idStr, errId) {
    const el = document.getElementById(idStr);
    const v = (el?.value || "").trim();

    if (!v) {
        const err = document.getElementById(errId);
        if (err) err.textContent = "This field is required";
        return false;
    }

    const err = document.getElementById(errId);
    if (err) err.textContent = "";
    return true;
}

function validateEmail(email) {
    return /^[^\s@]+@cisco\.com$/i.test(email);
}


/* ================================================================
   STEP 2 — Tag Entry
================================================================ */

const manualContainer = document.getElementById("manual_container");
const fileContainer = document.getElementById("file_container");
const tagsList = document.getElementById("tags_list");

document.getElementById("entry_mode").onchange = function () {
    const mode = this.value;

    if (mode === "manual") {
        manualContainer.style.display = "block";
        fileContainer.style.display = "none";

        if (!tagsList.children.length) addTagRow(true);
    } else if (mode === "file") {
        manualContainer.style.display = "none";
        fileContainer.style.display = "block";
    } else {
        manualContainer.style.display = "none";
        fileContainer.style.display = "none";
    }
};

/* Add Manual Tag Row */
document.getElementById("add_tag_btn").onclick = () => addTagRow(false);

function addTagRow(first = false, data = {}) {
    const row = document.createElement("div");
    row.className = "tag-row";

    const fields = ["namespace", "jira_ref", "component_name", "component_tag", "component_env_config"];

    fields.forEach(f => {
        const input = document.createElement("input");
        input.className = `form-input ${f}`;
        input.placeholder = f.replace(/_/g, " ");
        input.value = data[f] || "";
        row.appendChild(input);
    });

    const btnBox = document.createElement("div");

    if (!first) {
        const del = document.createElement("button");
        del.className = "btn-icon delete";
        del.textContent = "-";
        del.onclick = () => row.remove();
        btnBox.appendChild(del);
    }

    row.appendChild(btnBox);
    tagsList.appendChild(row);
}

/* ================================================================
   CSV Upload Handling
================================================================ */

document.getElementById("downloadSampleCSV").onclick = () => {
    const sample =
`namespace,jira_ref,component_name,component_tag,component_env_config
commonapps,WXCNCT-29921,api-application-status,12345...,ADD Module ABC
commonapps,WXCNCT-29921,httpd,12345...,`;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-release-tags.csv";
    a.click();
};

document.getElementById("csv_input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => parseCSV(evt.target.result);
    reader.readAsText(file);
});

function parseCSV(text) {
    tagsList.innerHTML = "";

    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    const required = ["namespace", "jira_ref", "component_name", "component_tag", "component_env_config"];
    const missing = required.filter(h => !headers.includes(h));

    if (missing.length) {
        document.getElementById("file_upload_error").textContent =
            "Missing columns: " + missing.join(", ");
        return;
    }

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(x => x.trim());
        const rowData = {};
        required.forEach((c, idx) => rowData[c] = parts[idx] || "");
        addTagRow(false, rowData);
    }

    manualContainer.style.display = "block";
    fileContainer.style.display = "none";
}


/* ================================================================
   VALIDATION — Shared Between Steps
================================================================ */

function id(idStr) {
    const el = document.getElementById(idStr);
    return el ? (el.value || "").trim() : "";
}

function validateStep(step) {

    /* STEP 1 */
    if (step === 1) {
        let ok = true;

        ok &= requireField("release_version", "release_version_error");
        ok &= requireField("release_date", "release_date_error");
        ok &= requireField("release_type", "release_type_error");
        ok &= requireField("release_manager", "release_manager_error");

        const manager = id("release_manager");
        if (manager && !validateEmail(manager)) {
            document.getElementById("release_manager_error").textContent =
                "Enter a valid Cisco email address";
            ok = false;
        }

        return !!ok;
    }

    /* STEP 2 */
    if (step === 2) {
        const mode = id("entry_mode");

        if (!mode) {
            document.getElementById("entry_mode_error").textContent =
                "Select entry mode";
            return false;
        } else {
            document.getElementById("entry_mode_error").textContent = "";
        }

        if (mode === "manual") {
            if (!tagsList.children.length) {
                alert("At least one tag row is required.");
                return false;
            }
        }

        if (mode === "file") {
            if (!document.getElementById("csv_input").files.length) {
                document.getElementById("file_upload_error").textContent =
                    "Please upload a CSV file.";
                return false;
            }
        }

        return true;
    }

    return true;
}


/* ================================================================
   STEP 3 — Review & JSON
================================================================ */

function buildJSON() {
    const json = {
        file_type: "release_tags",
        release_version: id("release_version"),
        release_date: id("release_date"),
        release_type: id("release_type"),
        release_manager: id("release_manager"),
        namespaces: {}
    };

    document.querySelectorAll(".tag-row").forEach(row => {
        const ns = row.querySelector(".namespace")?.value.trim();
        const jira = row.querySelector(".jira_ref")?.value.trim();

        if (!json.namespaces[ns]) {
            json.namespaces[ns] = {
                jira_ref: jira,
                components: []
            };
        }

        json.namespaces[ns].components.push({
            component_name: row.querySelector(".component_name")?.value.trim(),
            component_tag: row.querySelector(".component_tag")?.value.trim(),
            component_env_config: row.querySelector(".component_env_config")?.value.trim()
        });
    });

    document.getElementById("json_output").textContent =
        JSON.stringify(json, null, 2);
}


/* ================================================================
   VALIDATE + COPY + DOWNLOAD JSON
================================================================ */

/* VALIDATE JSON (via shared-validator.js) */
document.getElementById("validateJsonBtn").onclick = () => {
    const outputBox = document.getElementById("json_output");
    const errorsBox = document.getElementById("json_errors");
    const downloadBtn = document.getElementById("downloadBtn");

    // Rebuild JSON from current form state
    buildJSON();

    let json;
    try {
        json = JSON.parse(outputBox.textContent || "{}");
    } catch (e) {
        errorsBox.innerHTML = `<div class="error-list" style="color:#dc2626;">Invalid JSON format</div>`;
        downloadBtn.disabled = true;
        return;
    }

    // Validate against shared validator rules
    const errors = validateJSON(json, "release_tags");

    errorsBox.innerHTML = ""; // Clear previous messages

    if (errors.length === 0) {
        // VALID JSON
        errorsBox.innerHTML = `<div class="valid-ok">JSON is valid ✔ Ready to download.</div>`;
        downloadBtn.disabled = false;
    } else {
        // INVALID JSON
        downloadBtn.disabled = true;

        errorsBox.innerHTML = `
            <div class="error-list" style="color:#dc2626; margin-bottom:6px;">
                Validation failed — please fix the issues below.
            </div>
        `;

        const ul = document.createElement("ul");
        ul.className = "error-list";

        errors.forEach(err => {
            const li = document.createElement("li");
            li.textContent = err;
            ul.appendChild(li);
        });

        errorsBox.appendChild(ul);
    }
};


/* COPY JSON */
document.getElementById("copyBtn").onclick = () => {
    const btn = document.getElementById("copyBtn");

    navigator.clipboard.writeText(
        document.getElementById("json_output").textContent
    );

    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = "Copy JSON"; }, 3000);
};


/* DOWNLOAD JSON */
document.getElementById("downloadBtn").onclick = () => {
    const downloadBtn = document.getElementById("downloadBtn");
    const errorsBox = document.getElementById("json_errors");

    // If download is disabled → remind user to validate first
    if (downloadBtn.disabled) {
        errorsBox.innerHTML = `
            <div style="color:#b91c1c; font-weight:500;">
                Please validate the JSON before downloading.
            </div>
        `;
        return;
    }

    // Otherwise proceed with download
    const blob = new Blob(
        [document.getElementById("json_output").textContent],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "release_tags.json";
    a.click();
};

