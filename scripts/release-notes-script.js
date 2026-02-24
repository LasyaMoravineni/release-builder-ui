/* ============================================================
   RELEASE NOTES 
=============================================================== */

/* -------------------------
   GLOBAL HELPERS
------------------------- */
function id(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
}

function validateEmail(email) {
    return /^[^\s@]+@cisco\.com$/i.test(email);
}

function validateURL(url) {
    return /^https?:\/\/.+/i.test(url);
}

function createChip(text) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `${text} <span class="close">x</span>`;
    chip.querySelector(".close").onclick = () => chip.remove();
    return chip;
}

/* -------------------------
   WIZARD STATE
------------------------- */
let currentStep = 1;
const totalSteps = 6;

/* -------------------------
   INITIALIZATION
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    showStep(currentStep);
    setupNavigation();
    setupCustomerNotificationToggle();
    setupReleaseSummaryValidation();
    setupImpactServices();
    setupModules();
    setupCoverageRows();
    setupTestingChipInputs();
    setupQAObservations();
    setupReleaseDateFormatter();
    setupCopyAndDownload();
});

/* ============================================================
   1. WIZARD NAVIGATION
=========================================================== */
function showStep(step) {
    document.querySelectorAll(".step-panel").forEach(p => p.classList.remove("active"));
    document.getElementById("step" + step).classList.add("active");

    document.querySelectorAll("#stepNav li").forEach(li => li.classList.remove("active"));
    document.querySelector(`#stepNav li[data-step="${step}"]`).classList.add("active");

    document.getElementById("backBtn").style.visibility = step === 1 ? "hidden" : "visible";

    const nextBtn = document.getElementById("nextBtn");
    nextBtn.style.display = step === totalSteps ? "none" : "inline-block";

    if (step === 6) buildJSON();
}

function setupNavigation() {
    document.querySelectorAll("#stepNav li").forEach(li => {
        li.onclick = () => {
            currentStep = Number(li.dataset.step);
            showStep(currentStep);
        };
    });

    document.getElementById("backBtn").onclick = () => {
        if (currentStep > 1) showStep(--currentStep);
    };

    document.getElementById("nextBtn").onclick = () => {
        if (!validateStep(currentStep)) return;
        if (currentStep < totalSteps) showStep(++currentStep);
    };
}

/* ============================================================
   2. RELEASE DATE NORMALIZATION (YYYY-MM-DD)
=========================================================== */
function setupReleaseDateFormatter() {
    const input = document.getElementById("release_date");
    input.addEventListener("input", () => {
        const date = new Date(input.value + "T00:00:00");
        if (!isNaN(date)) {
            input.value = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");
        }
    });
}

/* ============================================================
   3. CUSTOMER NOTIFICATION TOGGLE
=========================================================== */
function setupCustomerNotificationToggle() {
    const select = document.getElementById("customer_notification");
    const group = document.getElementById("notify_message_group");
    const msg = document.getElementById("customer_notification_message");

    select.addEventListener("change", () => {
        if (select.value === "true") {
            group.style.display = "block";
        } else {
            group.style.display = "none";
            msg.value = "";
        }
    });
}

/* ============================================================
   4. RELEASE SUMMARY LIVE VALIDATION
=========================================================== */
function setupReleaseSummaryValidation() {
    const summary = document.getElementById("release_summary");
    const err = document.getElementById("s_err");

    summary.addEventListener("input", () => {
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount < 50) {
            err.textContent = "Minimum 50 words required";
            summary.classList.add("error");
        } else {
            err.textContent = "";
            summary.classList.remove("error");
        }
    });
}

/* ============================================================
   5. STEP 2 — SERVICES (Dynamic Add/Remove)
=========================================================== */
function setupImpactServices() {
    document.getElementById("add_service_btn").onclick = addService;
    addService();

    document.getElementById("impact_level").addEventListener("change", () => {
        const lvl = id("impact_level");
        const downtimeField = document.getElementById("downtime-field");
        const detailsField= document.getElementById("details-field");

        if (lvl === "None") {
            downtimeField.style.display = "none";
            downtimeField.value = "";
            detailsField.style.display="none";
        } else {
            downtimeField.style.display = "block";
            detailsField.style.display="block";
        }
    });
}

function addService() {
    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.innerHTML = `
        <input class="form-input service-input" placeholder="Service name">
        <button class="btn-icon delete">-</button>
    `;
    row.querySelector(".delete").onclick = () => row.remove();
    document.getElementById("services_container").appendChild(row);
}

/* ============================================================
   6. STEP 3 — MODULES (Dynamic Cards)
=========================================================== */
function setupModules() {
    document.getElementById("add_module_btn").onclick = addModule;
    addModule();
}

function addModule() {
    const card = document.createElement("div");
    card.className = "module-card";

    card.innerHTML = `
        <div class="module-header">
            Module
            <button class="btn-icon delete">-</button>
        </div>

        <div class="form-group">
            <label class="form-label">Namespace *</label>
            <input class="form-input module-namespace" placeholder="Example: core">
            <div class="error-msg module_namespace_error"></div>
        </div>

        <div class="form-group">
            <label class="form-label">Version </label>
            <input class="form-input module-version" placeholder="release-core_R6.12.0">
            <div class="error-msg module_version_error"></div>
        </div>

        <div class="form-group">
            <label>Jira Ref *</label>
            <input class="form-input module-jira" placeholder="Jira Ticket Number">
            <div class="error-msg module_jira_error"></div>
        </div>

        <div class="form-group">
            <label>Owner (email) *</label>
            <input class="form-input module-owner" placeholder="user@cisco.com">
            <div class="error-msg module_owner_error"></div>
        </div>

        <div class="form-group">
            <label>Repo (url)*</label>
            <input class="form-input module-repo">
            <div class="error-msg module_repo_error"></div>
        </div>

        <div class="form-group">
            <label>Liquibase Repo</label>
            <input class="form-input module-lrepo">
            <div class="error-msg module_lrepo_error"></div>
        </div>

        <div class="form-group">
            <label>Applications *</label>
            <div class="chip-box apps-box">
                <input class="module-app-input" placeholder="Type app & press Enter">
            </div>
            <div class="error-msg module_apps_error"></div>
        </div>
    `;

    card.querySelector(".delete").onclick = () => card.remove();
    setupModuleChipInput(card);
    document.getElementById("modules_container").appendChild(card);
}

function setupModuleChipInput(card) {
    const input = card.querySelector(".module-app-input");

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            const v = input.value.trim();
            if (!v) return;

            const chip = createChip(v);
            input.parentNode.insertBefore(chip, input);
            input.value = "";
        }
    });
}

/* ============================================================
   7. STEP 4 — COVERAGE DYNAMIC ROWS
=========================================================== */
function setupCoverageRows() {
    document.getElementById("add_coverage_btn").onclick = addCoverageRow;
    addCoverageRow();
}

function addCoverageRow() {
    const row = document.createElement("div");
    row.className = "dynamic-input-row";
    row.innerHTML = `
        <select class="coverage-type form-select">
            <option value="">-- Select Coverage Type --</option>
            <option>unit_tests</option>
            <option>integration_tests</option>
            <option>end_to_end_tests</option>
        </select>

        <input class="coverage-percentage form-input" placeholder="Ex: 80%">
        <button class="btn-icon delete">-</button>
    `;

    row.querySelector(".delete").onclick = () => row.remove();
    document.getElementById("coverage_container").appendChild(row);
}

/* ============================================================
   8. STEP 5 — TESTING CHIP INPUTS
=========================================================== */
function setupTestingChipInputs() {
    addChipInput("testing_stages_input", "testing_stages_box");
    addChipInput("automation_tools_input", "automation_tools_box");
}

function addChipInput(inputId, boxId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            const v = input.value.trim();
            if (!v) return;

            const chip = createChip(v);
            input.parentNode.insertBefore(chip, input);
            input.value = "";
        }
    });
}

/* ============================================================
   9. QA OBSERVATIONS LOGIC
=========================================================== */
function setupQAObservations() {
    window.addQAObservation = addQAObservation; 
    window.removeQAObservation = removeQAObservation;
}

function addQAObservation(btn) {
    const container = document.getElementById("qa_observations_container");

    const row = document.createElement("div");
    row.className = "dynamic-input-row";
    row.innerHTML = `
        <input class="form-input qa_observation_input">
        <button class="btn-icon" onclick="addQAObservation(this)">+</button>
        <button class="btn-icon delete" onclick="removeQAObservation(this)">-</button>
    `;

    container.appendChild(row);
}

function removeQAObservation(btn) {
    const container = document.getElementById("qa_observations_container");
    const rows = container.querySelectorAll(".dynamic-input-row");
    if (rows.length <= 1) return;
    btn.parentNode.remove();
}

/* ============================================================
   10. STEP-WISE VALIDATION
=========================================================== */
function validateStep(step) {
    let valid = true;

    function valRequired(id, errId) {
        const v = document.getElementById(id).value.trim();
        if (!v) {
            document.getElementById(errId).textContent = "This field is required";
            return false;
        }
        document.getElementById(errId).textContent = "";
        return true;
    }

    /* -------------------------
       STEP 1
    ------------------------- */
    if (step === 1) {
        valid &= valRequired("release_version", "v_err");
        valid &= valRequired("release_date", "d_err");
        valid &= valRequired("release_type", "t_err");
        valid &= valRequired("release_summary", "s_err");
        valid &= valRequired("release_manager", "m_err");
        valid &= valRequired("vscan", "vscan_error");
        valid &= valRequired("security_approval", "security_approval_error");
        valid &= valRequired("data_leak", "data_leak_error");
        valid &= valRequired("customer_notification", "customer_notification_error");

        const summary = id("release_summary");
        const wordCount = summary ? summary.split(/\s+/).filter(w => w.length > 0).length : 0;
        if (wordCount < 50) {
            document.getElementById("s_err").textContent = "Minimum 50 words required";
            valid = false;
        } else {
            document.getElementById("s_err").textContent = "";
        }

        const email = (document.getElementById("release_manager") || {}).value || "";
        const emailErrEl = document.getElementById("m_err");
        if (email && !validateEmail(email)) {
            if (emailErrEl) emailErrEl.textContent = "Invalid email format";
            valid = false;
        } else if (emailErrEl) {
            emailErrEl.textContent = "";
        }
    }

    /* -------------------------
       STEP 2
    ------------------------- */
    if (step === 2) {
        valid = valid && valRequired("impact_level", "impact_level_err");

        // services
        const services = [...document.querySelectorAll(".service-input")].map(i => i.value.trim());
        if (services.every(v => !v)) {
            document.getElementById("services_err").textContent = "At least one service is required";
            valid = false;
        } else document.getElementById("services_err").textContent = "";

        // expected downtime format
        const lvl = id("impact_level");
        const downtime = document.getElementById("expected_downtime");
        const downtimeErr = document.getElementById("downtime_err");

        const details=id("impact_details");
        const detailsErr=document.getElementById("impact_details_error")
        const detailsWordCount = details ? details.split(/\s+/).filter(w => w.length > 0).length : 0;

        if (lvl !== "None") {

            // 1. Validate downtime HH:MM:SS
            if (!/^\d{2}:\d{2}:\d{2}$/.test(downtime.value.trim())) {
                downtimeErr.textContent = "Enter time in HH:MM:SS format";
                valid = false;
            } else {
                downtimeErr.textContent = "";
            }

            // 2. Validate impact details 50 words minimum
            if (detailsWordCount < 50) {
                detailsErr.textContent = "Minimum 50 words required";
                valid = false;
            } else {
                detailsErr.textContent = "";
            }
        } else {
            downtimeErr.textContent = "";
            detailsErr.textContent="";
        }
    }

    /* -------------------------
       STEP 3 — Modules
    ------------------------- */
    if (step === 3) {
        let allModulesValid = true;
        const cards = document.querySelectorAll(".module-card");
        const namespaces = [];

        cards.forEach(card => {
            card.querySelectorAll(".error-msg").forEach(e => (e.textContent = ""));

            const ns = card.querySelector(".module-namespace").value.trim();
            const jira = card.querySelector(".module-jira").value.trim();
            const owner = card.querySelector(".module-owner").value.trim();
            const repo = card.querySelector(".module-repo").value.trim();
            const lrepo = card.querySelector(".module-lrepo").value.trim();
            const apps = card.querySelectorAll(".apps-box .chip");

            if (!ns) {
                card.querySelector(".module_namespace_error").textContent = "Namespace is required";
                allModulesValid = false;
            } else namespaces.push({ ns, card });

            if (!jira) {
                card.querySelector(".module_jira_error").textContent = "Jira Ref is required";
                allModulesValid = false;
            }

            if (!owner || !validateEmail(owner)) {
                card.querySelector(".module_owner_error").textContent = "Valid email required";
                allModulesValid = false;
            }

            if (!repo || !validateURL(repo)) {
                card.querySelector(".module_repo_error").textContent = "URL must start with http:// or https://";
                allModulesValid = false;
            }

            if (lrepo && !validateURL(lrepo)) {
                card.querySelector(".module_lrepo_error").textContent = "Invalid URL";
                allModulesValid = false;
            }

            if (apps.length === 0) {
                card.querySelector(".module_apps_error").textContent = "At least one application required";
                allModulesValid = false;
            }
        });

        // namespace uniqueness
        const dup = namespaces.map(o => o.ns).filter((ns, i, arr) => arr.indexOf(ns) !== i);
        if (dup.length) {
            namespaces.forEach(o => {
                if (dup.includes(o.ns)) {
                    o.card.querySelector(".module_namespace_error").textContent = "Namespace must be unique";
                }
            });
            allModulesValid = false;
        }

        if (!allModulesValid) valid = false;
    }

    /* -------------------------
       STEP 4 — QA VALIDATION
    ------------------------- */
    if (step === 4) {
        valid &= valRequired("qa_by", "qa_by_err");

        const results = id("qa_results");
        if (!results || !validateURL(results)) {
            document.getElementById("qa_results_err").textContent = "Valid URL required";
            valid = false;
        }

        valid &= valRequired("status_notes", "status_notes_err");

        // required dropdowns
        valid &= valRequired("qa_status", "qa_status_err");
        valid &= valRequired("crs_status", "crs_status_err");
        valid &= valRequired("rollback_status", "rollback_status_err");

        // coverage
        const rows = document.querySelectorAll("#coverage_container .dynamic-input-row");
        if (rows.length === 0) {
            const msg = document.createElement("div");
            msg.className = "error-msg coverage_error_global";
            msg.textContent = "At least one coverage entry required";
            document.getElementById("coverage_container").appendChild(msg);
            valid = false;
        }

        rows.forEach(row => {
            row.querySelectorAll(".coverage_error").forEach(e => e.remove());
            const type = row.querySelector(".coverage-type").value.trim();
            const pctInput = row.querySelector(".coverage-percentage");
            let pct = pctInput.value.trim();

            // --- auto-append % if user did not enter it ---
            if (pct && /^\d{1,3}$/.test(pct)) {
                pct = pct + "%";
                pctInput.value = pct; // update UI
            }

            // validations
            if (!type) {
                const e = document.createElement("div");
                e.className = "error-msg coverage_error";
                e.textContent = "Required";
                row.appendChild(e);
                valid = false;
            }

            // Accept only formats like "80%" "95%" "100%"
            if (!/^\d{1,3}%$/.test(pct)) {
                const e = document.createElement("div");
                e.className = "error-msg coverage_error";
                e.textContent = "Format: 80%";
                row.appendChild(e);
                valid = false;
            }
        });
    }

    /* -------------------------
       STEP 5 — TESTING VALIDATION
    ------------------------- */
    if (step === 5) {
        if (document.querySelectorAll("#testing_stages_box .chip").length === 0) {
            document.getElementById("testing_stages_error").textContent = "Add at least one testing stage.";
            valid = false;
        } else document.getElementById("testing_stages_error").textContent = "";

        valid &= valRequired("sanity_automated", "sanity_automated_error");
    }

    return !!valid;
}

/* ============================================================
   11. BUILD FINAL JSON
=========================================================== */
function buildJSON() {
    const coverageObj = {};
    document.querySelectorAll("#coverage_container .dynamic-input-row").forEach(row => {
        const type = row.querySelector(".coverage-type").value.trim();
        const pct = row.querySelector(".coverage-percentage").value.trim();
        if (type) coverageObj[type] = pct;
    });

    const json = {
        file_type: "release_notes",
        release_version: id("release_version"),
        release_date: id("release_date"),
        release_type: id("release_type"),
        release_summary: id("release_summary"),
        release_manager: id("release_manager"),

        vulerability_scan: id("vscan"),
        security_approval_status: id("security_approval"),
        Cross_tenant_dataleak_check: id("data_leak"),

        customer_notification: {
            notification_required: id("customer_notification") === "true"
        },

        impact_info: {
            affected_services: [...document.querySelectorAll(".service-input")]
                .map(i => i.value.trim())
                .filter(Boolean),
            expected_downtime: id("expected_downtime"),
            impact_level: id("impact_level"),
            details: id("impact_details")
        },

        modules: [...document.querySelectorAll(".module-card")].map(card => ({
            namespace: card.querySelector(".module-namespace").value.trim(),
            version: card.querySelector(".module-version").value.trim(),
            jira_ref: card.querySelector(".module-jira").value.trim(),
            owner: card.querySelector(".module-owner").value.trim(),
            repo: card.querySelector(".module-repo").value.trim(),
            liquibase_repo: card.querySelector(".module-lrepo").value.trim(),
            applications: [...card.querySelectorAll(".apps-box .chip")]
                .map(c => c.textContent.replace("x", "").trim())
        })),

        quality_assurance: {
            conducted_by: id("qa_by"),
            results: id("qa_results"),
            status_notes: id("status_notes"),
            point_of_contact: id("qa_poc"),
            approved_by: id("qa_approved_by"),
            status: id("qa_status"),
            crs_test_status: id("crs_status"),
            crs_test_status_notes: id("crs_status_notes"),
            rollback_test_status: id("rollback_status"),
            rollback_test_status_notes: id("rollback_status_notes"),
            coverage: coverageObj
        },

        testing_stages: [...document.querySelectorAll("#testing_stages_box .chip")]
            .map(c => c.textContent.replace("x", "").trim()),

        test_automation: {
            is_sanity_automated: document.getElementById("sanity_automated").value === "true",
            automation_tools: [...document.querySelectorAll("#automation_tools_box .chip")]
                .map(c => c.textContent.replace("x", "").trim())
        },

        qa_observations: [...document.querySelectorAll(".qa_observation_input")]
            .map(i => i.value.trim())
            .filter(Boolean)
    };

    document.getElementById("json_output").textContent = JSON.stringify(json, null, 2);
}

/* ============================================================
   12. VALIDATE / COPY / DOWNLOAD JSON
=========================================================== */

/* VALIDATE JSON (using shared-validator.js) */
document.getElementById("validateJsonBtn").onclick = () => {
    const outputBox = document.getElementById("json_output");
    const errorsBox = document.getElementById("json_errors");
    const downloadBtn = document.getElementById("downloadBtn");

    // rebuild JSON before validating
    buildJSON();

    const json = JSON.parse(outputBox.textContent || "{}");
    const errors = validateJSON(json, "release_notes");  // <-- shared validator

    errorsBox.innerHTML = ""; // Clear previous results

    if (errors.length === 0) {
        // VALID
        errorsBox.innerHTML = `<div class="valid-ok">JSON is valid ✔ Ready to download.</div>`;
        downloadBtn.disabled = false;
    } else {
        // INVALID
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


/* COPY + DOWNLOAD HANDLERS */
function setupCopyAndDownload() {

    /* ---------------------------
       COPY JSON
    --------------------------- */
    document.getElementById("copyBtn").onclick = () => {
        const btn = document.getElementById("copyBtn");
        navigator.clipboard.writeText(document.getElementById("json_output").textContent);

        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy JSON"; }, 3000);
    };

    /* ---------------------------
       DOWNLOAD JSON
    --------------------------- */
    document.getElementById("downloadBtn").onclick = () => {
        const downloadBtn = document.getElementById("downloadBtn");
        const errorsBox = document.getElementById("json_errors");

        // If DOWNLOAD is disabled → show reminder message
        if (downloadBtn.disabled) {
            errorsBox.innerHTML = `
                <div style="color:#b91c1c; font-weight:500;">
                    Please validate the JSON before downloading.
                </div>
            `;
            return;
        }

        // If valid → download normally
        const blob = new Blob(
            [document.getElementById("json_output").textContent],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "release_notes.json";
        a.click();
    };
}

