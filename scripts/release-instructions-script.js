/* ============================================================
   RELEASE INSTRUCTIONS 
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* --------------------------------------------------------
       Helpers
    -------------------------------------------------------- */
    const $ = (id) => document.getElementById(id);
    const safeVal = (el) => (el ? (el.value || "").trim() : "");
    const isEmail = (v) => /^[^\s@]+@cisco\.com$/i.test(String(v || ""));

    /* --------------------------------------------------------
       Wizard Navigation
    -------------------------------------------------------- */
    let currentStep = 1;
    const totalSteps = 3;

    function showStep(step) {
        document.querySelectorAll(".step-panel").forEach(p => p.classList.remove("active"));
        $(`step${step}`).classList.add("active");

        document.querySelectorAll("#stepNav li").forEach(li => li.classList.remove("active"));
        document.querySelector(`#stepNav li[data-step="${step}"]`)?.classList.add("active");

        $("backBtn").style.visibility = step === 1 ? "hidden" : "visible";

        const nextBtn = $("nextBtn");
        if (step === totalSteps) {
            nextBtn.style.display = "none";
            buildJSON();
        } else {
            nextBtn.style.display = "inline-block";
            nextBtn.textContent = "Next";
        }
    }

    showStep(currentStep);

    /* Side navigation */
    document.querySelectorAll("#stepNav li").forEach(li => {
        li.addEventListener("click", () => {
            currentStep = Number(li.dataset.step);
            showStep(currentStep);
        });
    });

    $("backBtn").addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    $("nextBtn").addEventListener("click", () => {
        if (!validateStep(currentStep)) return;
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    });


    /* ============================================================
       STEP 2 — Manual Change Cards
    ============================================================ */

    const container = $("manual_changes_container");
    $("add_change_btn").addEventListener("click", addChangeCard);

    function addChangeCard() {
        const tpl = $("manual_change_template");
        if (!tpl) return;

        const clone = tpl.content.cloneNode(true);

        /* Numbering */
        const idxEl = clone.querySelector(".change-index");
        idxEl.textContent = container.children.length + 1;

        /* Remove card */
        clone.querySelector(".remove-change").addEventListener("click", function () {
            const card = this.closest(".manual-change");
            card.remove();
            renumberChanges();
        });

        /* Custom category show/hide */
        const categorySel = clone.querySelector(".category");
        const customCatInput = clone.querySelector(".custom_category_input");
        categorySel.addEventListener("change", () => {
            if (categorySel.value === "Custom") customCatInput.classList.remove("hidden");
            else {
                customCatInput.classList.add("hidden");
                customCatInput.value = "";
            }
        });

        /* Chip input (components) */
        const compInput = clone.querySelector(".comp-input");
        compInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const val = compInput.value.trim();
                if (val) {
                    addChip(compInput, val);
                    compInput.value = "";
                }
            }
        });

        /* Step lists (prereq, exec, validation, rollback) */
        const prereqList = clone.querySelector(".prereq_list");
        const execList = clone.querySelector(".exec_list");
        const valList = clone.querySelector(".val_list");
        const rbList = clone.querySelector(".rb_list");

        createStepRow(prereqList);
        createStepRow(execList);
        createStepRow(valList);
        createStepRow(rbList);

        clone.querySelector(".prereq_add_btn").onclick = () => createStepRow(prereqList);
        clone.querySelector(".exec_add_btn").onclick = () => createStepRow(execList);
        clone.querySelector(".val_add_btn").onclick = () => createStepRow(valList);
        clone.querySelector(".rb_add_btn").onclick = () => createStepRow(rbList);

        /* Downtime required → estimated_downtime visibility */
        const downtimeSel = clone.querySelector(".downtime_required");
        const estField = clone.querySelector(".estimated_downtime");
        downtimeSel.addEventListener("change", () => {
            if (downtimeSel.value === "true") estField.classList.remove("hidden");
            else {
                estField.classList.add("hidden");
                estField.value = "";
            }
        });

        /* Automation → script visibility */
        const autoSel = clone.querySelector(".automation");
        const autoScript = clone.querySelector(".automation_script");
        autoSel.addEventListener("change", () => {
            if (autoSel.value === "true") autoScript.classList.remove("hidden");
            else {
                autoScript.classList.add("hidden");
                autoScript.value = "";
            }
        });

        container.appendChild(clone);
    }

    function createStepRow(list) {
        const row = document.createElement("div");
        row.className = "dynamic-row";
        row.innerHTML = `
            <input class="form-input step-input" placeholder="Enter step">
            <button class="btn-icon delete">-</button>
        `;
        row.querySelector(".delete").onclick = () => row.remove();
        list.appendChild(row);
    }

    function renumberChanges() {
        [...container.children].forEach((card, i) => {
            card.querySelector(".change-index").textContent = i + 1;
        });
    }

    function addChip(inputEl, text) {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.innerHTML = `${text} <span class="close">x</span>`;
        chip.querySelector(".close").onclick = () => chip.remove();
        inputEl.parentNode.insertBefore(chip, inputEl);
    }

    function getSteps(listEl) {
        return [...listEl.querySelectorAll(".step-input")]
            .map(i => i.value.trim())
            .filter(Boolean);
    }


    /* ============================================================
       VALIDATION
    ============================================================ */

    function validateStep(step) {
        let ok = true;

        const req = (el, err) => {
            if (!el || !el.value.trim()) {
                err.textContent = "This field is required";
                return false;
            }
            err.textContent = "";
            return true;
        };

        /* ----------------------------------------
           STEP 1 — Basic Release Info
        ---------------------------------------- */
        if (step === 1) {
            const rv = $("release_version");
            const rd = $("release_date");
            const rb = $("release_by");

            ok &= req(rv, $("release_version_err"));
            ok &= req(rd, $("release_date_err"));

            if (!req(rb, $("release_by_err"))) ok = false;
            else if (!isEmail(rb.value.trim())) {
                $("release_by_err").textContent = "Invalid email format";
                ok = false;
            }
        }

        /* ----------------------------------------
           STEP 2 — Manual Changes
        ---------------------------------------- */
        if (step === 2) {
            const cards = document.querySelectorAll(".manual-change");
            const topErr = $("instruction_err");

            if (!cards.length) {
                topErr.textContent = "At least one instruction is required.";
                return false;
            }
            topErr.textContent = "";

            cards.forEach(card => {
                const get = cls => card.querySelector("." + cls);

                /* Required fields */
                ok &= req(get("sequence_id"), card.querySelector(".sequence_id_err"));
                ok &= req(get("phase"), card.querySelector(".phase_err"));
                ok &= req(get("category"), card.querySelector(".category_err"));
                ok &= req(get("automation"), card.querySelector(".automation_err"));
                ok &= req(get("description"), card.querySelector(".description_err"));
                ok &= req(get("namespaces"), card.querySelector(".namespaces_err"));
                ok &= req(get("responsible_team"), card.querySelector(".responsible_team_err"));
                ok &= req(get("restart_required"), card.querySelector(".restart_required_err"));
                ok &= req(get("downtime_required"), card.querySelector(".downtime_required_err"));
                ok &= req(get("rollback_possible"), card.querySelector(".rollback_possible_err"));
                ok &= req(get("risk_level"), card.querySelector(".risk_level_err"));

                /* Custom category */
                if (get("category").value === "Custom") {
                    const custom = get("custom_category_input");
                    if (!custom.value.trim()) {
                        card.querySelector(".custom_category_err").textContent = "This field is required";
                        ok = false;
                    }
                }

                /* Owner email (optional) */
                const owner = get("owner_email");
                const ownerErr = card.querySelector(".owner_email_err");
                if (owner.value.trim() && !isEmail(owner.value.trim())) {
                    ownerErr.textContent = "Invalid email";
                    ok = false;
                } else ownerErr.textContent = "";

                /* Automation script when automation = true */
                if (get("automation").value === "true") {
                    ok &= req(get("automation_script"), card.querySelector(".automation_script_err"));
                }

                /* Estimated downtime */
                if (get("downtime_required").value === "true") {
                    ok &= req(get("estimated_downtime"), card.querySelector(".estimated_downtime_err"));
                }

                /* Components required */
                const comps = card.querySelectorAll(".components_box .chip");
                if (!comps.length) {
                    card.querySelector(".components_err").textContent = "Add at least one component";
                    ok = false;
                } else card.querySelector(".components_err").textContent = "";

                /* Execution steps */
                const execRows = [...card.querySelectorAll(".exec_list .step-input")];
                if (!execRows.some(r => r.value.trim())) {
                    card.querySelector(".exec_err").textContent = "Add at least one execution step";
                    ok = false;
                } else card.querySelector(".exec_err").textContent = "";

                /* Validation steps */
                const valRows = [...card.querySelectorAll(".val_list .step-input")];
                if (!valRows.some(r => r.value.trim())) {
                    card.querySelector(".val_err").textContent = "Add at least one validation step";
                    ok = false;
                } else card.querySelector(".val_err").textContent = "";

                /* Rollback steps */
                if (get("rollback_possible").value === "true") {
                    const rbRows = [...card.querySelectorAll(".rb_list .step-input")];
                    if (!rbRows.some(r => r.value.trim())) {
                        card.querySelector(".rb_err").textContent = "Add at least one rollback step";
                        ok = false;
                    } else card.querySelector(".rb_err").textContent = "";
                }
            });

            /* Unique sequence ID validation */
            const seqValues = [];
            document.querySelectorAll(".sequence_id").forEach((el, i) => {
                const val = el.value.trim();
                const errEl = document.querySelectorAll(".sequence_id_err")[i];
                if (seqValues.includes(val)) {
                    errEl.textContent = "Sequence ID must be unique";
                    ok = false;
                } else {
                    seqValues.push(val);
                    errEl.textContent = "";
                }
            });
        }

        return !!ok;
    }


    /* ============================================================
       BUILD JSON — STEP 3
    ============================================================ */

    function buildJSON() {
        const json = {
            file_type: "release_instructions",
            release_version: safeVal($("release_version")),
            release_date: safeVal($("release_date")),
            release_by: safeVal($("release_by")),

            manual_changes: [...document.querySelectorAll(".manual-change")].map(card => {
                const g = cls => card.querySelector("." + cls);

                return {
                    sequence_id: Number(safeVal(g("sequence_id")) || 0),
                    phase: safeVal(g("phase")),
                    category: safeVal(g("category")),
                    jira_ref: safeVal(g("jira_ref")),
                    owner: safeVal(g("owner_email")),
                    description: safeVal(g("description")),
                    namespaces: safeVal(g("namespaces")),

                    components: [...card.querySelectorAll(".components_box .chip")]
                        .map(c => c.textContent.replace("x", "").trim()),

                    restart_required: safeVal(g("restart_required")) === "true",
                    downtime_required: safeVal(g("downtime_required")) === "true",
                    estimated_downtime: safeVal(g("estimated_downtime")),
                    rollback_possible: safeVal(g("rollback_possible")) === "true",
                    risk_level: safeVal(g("risk_level")),
                    automation: safeVal(g("automation")),
                    automation_script: safeVal(g("automation_script")),

                    prerequisites: getSteps(card.querySelector(".prereq_list")),
                    execution_steps: getSteps(card.querySelector(".exec_list")),
                    validation_steps: getSteps(card.querySelector(".val_list")),
                    rollback_steps: getSteps(card.querySelector(".rb_list")),

                    responsible_team: safeVal(g("responsible_team")),
                };
            })
        };

        $("json_output").textContent = JSON.stringify(json, null, 2);
    }


    /* ============================================================
        Validate + Copy + Download
    ============================================================ */

    /* VALIDATE JSON (using shared-validator.js) */
    document.getElementById("validateJsonBtn").onclick = () => {
        const output = document.getElementById("json_output");
        const errorsBox = document.getElementById("json_errors");
        const downloadBtn = document.getElementById("download_btn");

        // Always rebuild JSON before validating
        buildJSON();

        let jsonObj;
        try {
            jsonObj = JSON.parse(output.textContent || "{}");
        } catch (err) {
            errorsBox.innerHTML = `<div class="error-list" style="color:#dc2626;">Invalid JSON format</div>`;
            downloadBtn.disabled = true;
            return;
        }

        // Validate using shared validator
        const errors = validateJSON(jsonObj, "release_instructions");

        errorsBox.innerHTML = ""; // Clear previous messages

        if (errors.length === 0) {
            errorsBox.innerHTML = `<div class="valid-ok">JSON is valid ✔ Ready to download.</div>`;
            downloadBtn.disabled = false;
        } else {
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
    document.getElementById("copy_btn").addEventListener("click", () => {
        const btn = document.getElementById("copy_btn");

        navigator.clipboard.writeText(
            document.getElementById("json_output").textContent
        );

        btn.textContent = "Copied";

        setTimeout(() => {
            btn.textContent = "Copy JSON";
        }, 3000);
    });


    /* DOWNLOAD JSON */
    document.getElementById("download_btn").addEventListener("click", () => {
        const downloadBtn = document.getElementById("download_btn");
        const errorsBox = document.getElementById("json_errors");

        // If user hasn't validated → warn
        if (downloadBtn.disabled) {
            errorsBox.innerHTML = `
                <div style="color:#b91c1c; font-weight:500;">
                    Please validate the JSON before downloading.
                </div>
            `;
            return;
        }

        // Otherwise download
        const blob = new Blob(
            [document.getElementById("json_output").textContent],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "release_instructions.json";
        a.click();
    });


});
