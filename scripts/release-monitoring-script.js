/* ============================================================
   RELEASE MONITORING 
============================================================ */

(() => {

  /* ============================================================
     STEP / WIZARD NAVIGATION
  ============================================================ */
  let currentStep = 1;
  const totalSteps = 4;

  function showStep(step) {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('step' + step);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('#stepNav li').forEach(li => li.classList.remove('active'));
    const nav = document.querySelector(`#stepNav li[data-step="${step}"]`);
    if (nav) nav.classList.add('active');

    document.getElementById('backBtn').style.visibility = step === 1 ? 'hidden' : 'visible';

    const nextBtn = document.getElementById('nextBtn');
    if (step === totalSteps) {
      nextBtn.style.display = 'none';
      buildJSON(); // Auto-generate JSON when entering Step 4
    } else {
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = 'Next';
    }
  }
  showStep(currentStep);

  document.querySelectorAll('#stepNav li').forEach(li => {
    li.addEventListener('click', () => {
      currentStep = Number(li.dataset.step);
      showStep(currentStep);
    });
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; showStep(currentStep); }
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) { currentStep++; showStep(currentStep); }
  });


  /* ============================================================
     CATEGORY MAP
  ============================================================ */
  const categoryMap = {
    api_health: { containerId: 'api_health_container', tplId: 'template_api_health', sectionId: 'section_api_health' },
    exception: { containerId: 'exception_container', tplId: 'template_exception', sectionId: 'section_exception' },
    infrastructure: { containerId: 'infrastructure_container', tplId: 'template_infrastructure', sectionId: 'section_infrastructure' },
    log: { containerId: 'log_container', tplId: 'template_log', sectionId: 'section_log' },
    aws_services: { containerId: 'aws_container', tplId: 'template_aws_services', sectionId: 'section_aws_services' },
    queue: { containerId: 'queue_container', tplId: 'template_queue', sectionId: 'section_queue' },
    alb: { containerId: 'alb_container', tplId: 'template_alb', sectionId: 'section_alb' }
  };

  // Hide all category blocks at load
  Object.values(categoryMap).forEach(cfg => {
    const sec = document.getElementById(cfg.sectionId);
    if (sec) sec.style.display = 'none';
  });

  /* ============================================================
     STEP 2 — CATEGORY SELECTION
  ============================================================ */
  const categorySelect = document.getElementById('rm_category_selector');

  categorySelect.addEventListener('change', () => {
    Object.values(categoryMap).forEach(cfg => {
      const s = document.getElementById(cfg.sectionId);
      if (s) s.style.display = 'none';
    });

    const sel = categorySelect.value;
    if (!sel) return;

    const cfg = categoryMap[sel];
    const section = document.getElementById(cfg.sectionId);
    if (section) section.style.display = 'block';

    const container = document.getElementById(cfg.containerId);
    if (container && container.children.length === 0) {
      addEntryCard(sel); // Auto add first entry
    }
  });

  /* Add-entry button wiring */
  const addMap = {
    add_api_health_btn: 'api_health',
    add_exception_btn: 'exception',
    add_infra_btn: 'infrastructure',
    add_log_btn: 'log',
    add_aws_btn: 'aws_services',
    add_queue_btn: 'queue',
    add_alb_btn: 'alb'
  };

  Object.entries(addMap).forEach(([btn, cat]) => {
    const b = document.getElementById(btn);
    if (b) b.addEventListener('click', () => addEntryCard(cat));
  });


  /* ============================================================
     TEMPLATE CLONING + REMEDIATION CHIP HANDLING
  ============================================================ */
  function addEntryCard(cat) {
    const cfg = categoryMap[cat];
    const tpl = document.getElementById(cfg.tplId);
    const container = document.getElementById(cfg.containerId);
    if (!tpl || !container) { alert('Missing template or container for ' + cat); return; }

    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector('.entry-card');
    if (!card) return;

    const idx = container.children.length + 1;
    const title = card.querySelector('.entry-title');
    if (title) title.textContent = `Entry ${idx}`;

    const rem = card.querySelector('.remove-entry');
    if (rem) rem.addEventListener('click', () => {
      card.remove();
      [...container.querySelectorAll('.entry-card')].forEach((c, i) => {
        const t = c.querySelector('.entry-title');
        if (t) t.textContent = `Entry ${i + 1}`;
      });
    });

    card.querySelectorAll('.add-remediation').forEach(btn => {
      setupRemediationInline(btn);
    });

    container.appendChild(card);
  }

  function setupRemediationInline(btn) {
    btn.addEventListener('click', function () {
      if (this.parentNode.querySelector('.remediation-inline')) return;

      this.style.display = 'none';
      const parent = this.parentNode;

      const wrap = document.createElement('div');
      wrap.className = 'remediation-inline';

      const input = document.createElement('input');
      input.className = 'form-input remediation-input';
      input.placeholder = 'Action...';
      const save = document.createElement('button'); save.className = 'btn-secondary save-btn'; save.textContent = 'Save';
      const cancel = document.createElement('button'); cancel.className = 'btn-secondary cancel-btn'; cancel.textContent = 'Cancel';

      wrap.appendChild(input);
      wrap.appendChild(save);
      wrap.appendChild(cancel);

      parent.insertBefore(wrap, this);

      save.addEventListener('click', () => {
        const v = input.value.trim();
        if (!v) return input.style.border = '1px solid #b00020';
        input.style.border = '';
        createChip(parent.querySelector('.remediation_actions'), v);
        wrap.remove();
        btn.style.display = '';
      });

      cancel.addEventListener('click', () => {
        wrap.remove();
        btn.style.display = '';
      });
    });
  }

  function createChip(container, text) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtml(text)} <span class="close">×</span>`;
    chip.querySelector('.close').addEventListener('click', () => chip.remove());
    container.appendChild(chip);
  }


  /* ============================================================
     STEP-BY-STEP VALIDATION 
  ============================================================ */
  function validateStep(step) {
    let ok = true;

    /* ---------------------------
       STEP 1 — Basic Info
    --------------------------- */
    if (step === 1) {
      const req = [
        ['rm_release_version', 'rm_release_version_err'],
        ['rm_release_date', 'rm_release_date_err'],
        ['rm_environment', 'rm_environment_err'],
        ['rm_monitored_by', 'rm_monitored_by_err']
      ];
      req.forEach(([id, err]) => {
        const el = document.getElementById(id);
        const msg = (!el || !el.value.trim()) ? 'This field is required' : '';
        document.getElementById(err).textContent = msg;
        if (msg) ok = false;
      });
    }

    /* ---------------------------
      STEP 2 — Category Entries
    --------------------------- */
    if (step === 2) {
        const cat = categorySelect.value;
        const catErr = document.getElementById('rm_category_selector_err');

        if (!cat) {
            catErr.textContent = 'Select a category';
            return false;
        }
        catErr.textContent = '';

        const container = document.getElementById(categoryMap[cat].containerId);
        const cards = [...container.querySelectorAll('.entry-card')];

        if (cards.length === 0) {
            catErr.textContent = 'Add at least one entry';
            return false;
        }

        cards.forEach(card => {
            // clear old errors
            card.querySelectorAll('.error-msg').forEach(e => e.textContent = '');

            function req(cls) {
                const el = card.querySelector('.' + cls);
                const err = el?.parentNode.querySelector('.error-msg');
                if (!el || !el.value.trim()) {
                    if (err) err.textContent = 'Required';
                    ok = false;
                }
            }

            function reqMulti(cls) {
                const el = card.querySelector('.' + cls);
                const err = el?.parentNode.querySelector('.error-msg');
                if (el && el.selectedOptions.length === 0) {
                    if (err) err.textContent = 'Required';
                    ok = false;
                }
            }

            function reqNumber(cls) {
                const el = card.querySelector('.' + cls);
                const err = el?.parentNode.querySelector('.error-msg');
                const v = el?.value.trim();
                if (!v) {
                    if (err) err.textContent = 'Required';
                    ok = false;
                } else if (isNaN(v)) {
                    if (err) err.textContent = 'Must be a number';
                    ok = false;
                }
            }

            /* ---------------------------
              Required common fields
            --------------------------- */
            req('alert_action');
            req('alert_priority');
            req('alert_condition');
            req('alert_reason');

            reqMulti('alert_source');
            reqMulti('alert_channel');

            /* ---------------------------
              CATEGORY-SPECIFIC VALIDATION
            --------------------------- */

            /* === API HEALTH MONITORING === */
            if (cat === "api_health") {
                req('endpoint_name');
                req('check_type'); // HTTP / HTTPS

                const urlEl = card.querySelector('.endpoint_url');
                const urlErr = urlEl?.parentNode.querySelector('.error-msg');
                if (!urlEl.value.trim()) {
                    urlErr.textContent = "Required";
                    ok = false;
                } else if (!isValidUrl(urlEl.value.trim())) {
                    urlErr.textContent = "Invalid URL";
                    ok = false;
                }
            }

            /* === EXCEPTION MONITORING === */
            if (cat === "exception") {
                req('index_name');
                req('timestamp_field'); // text but mandatory
            }

            /* === INFRASTRUCTURE MONITORING === */
            if (cat === "infrastructure") {
                req('dashboard_name');
                req('panel_name');
                req('metric_query');
            }

            /* === LOG MONITORING === */
            if (cat === "log") {
                req('index_name');
                req('timestamp_field');
            }

            /* === AWS SERVICES MONITORING === */
            if (cat === "aws_services") {
              req('service_name');
                req('metric_name');
                req('namespace');
                reqNumber('threshold');
                req('comparison_operator');
            }

            /* === QUEUE MONITORING === */
            if (cat === "queue") {
                req('queue_name');
                req('index_name');
                reqNumber('threshold_value');
                req('threshold_unit');
            }

            /* === ALB EXCEPTIONS === */
            if (cat === "alb") {
                req('alb_name');
                req('metric_name');
                reqNumber('threshold_value');
            }

            /* -----------------------------
              Remediation Actions Required
            ----------------------------- */
            const chips = card.querySelectorAll('.remediation_actions .chip');
            const remErr = card.querySelector('.remediation_actions')?.parentNode.querySelector('.error-msg');
            if (chips.length === 0 && remErr) {
                remErr.textContent = 'At least one action required';
                ok = false;
            }
        });
    }


    /* ---------------------------
       STEP 3 — Validation Summary
    --------------------------- */
    if (step === 3) {
      const req = [
        ['validated_by', 'validated_by_err'],
        ['validation_status', 'validation_status_err']
      ];
      req.forEach(([id, err]) => {
        const el = document.getElementById(id);
        const msg = (!el || !el.value.trim()) ? 'This field is required' : '';
        document.getElementById(err).textContent = msg;
        if (msg) ok = false;
      });

      const lastVal = elVal('last_validated_on');
      const lastErr = document.getElementById('last_validated_on_err');
      if (lastVal && !isValidTimestamp(lastVal)) {
        lastErr.textContent = 'Format must be YYYY-MM-DD HH:MM:SS';
        ok = false;
      } else lastErr.textContent = '';
    }

    return ok;
  }


  /* ============================================================
     FINAL JSON BUILDER (USED IN REVIEW)
  ============================================================ */
  function buildJSON() {
    const json = {
      file_type: 'release_monitoring',
      release_version: elVal('rm_release_version'),
      release_date: elVal('rm_release_date'),
      environment: elVal('rm_environment'),
      monitored_by: elVal('rm_monitored_by'),
      monitoring_summary: elVal('rm_monitoring_summary'),
      monitoring_categories: {
        api_health_monitoring: readEntries('api_health'),
        exception_monitoring: readEntries('exception'),
        infrastructure_monitoring: readEntries('infrastructure'),
        log_monitoring: readEntries('log'),
        aws_services_monitoring: readEntries('aws_services'),
        queue_monitoring: readEntries('queue'),
        alb_exceptions: readEntries('alb')
      },
      validation_summary: {
        validated_by: elVal('validated_by'),
        validation_status: elVal('validation_status'),
        last_validated_on: formattedLastValidatedOn(),
        validation_comments: elVal('validation_comments')
      }
    };

    document.getElementById('json_output').textContent =
      JSON.stringify(json, null, 2);

    return json;
  }

  function readEntries(cat) {
    const cfg = categoryMap[cat];
    const container = document.getElementById(cfg.containerId);
    if (!container) return [];

    const cards = [...container.querySelectorAll('.entry-card')];

    return cards.map(card => {
      const get = cls => {
        const el = card.querySelector('.' + cls);
        if (!el) return '';
        if (el.tagName === 'SELECT' && el.multiple)
          return [...el.selectedOptions].map(o => o.value);
        return (el.value || '').trim();
      };
      const num = cls => {
        const v = get(cls);
        return v === '' ? null : Number(v);
      };
      const chips = () =>
        [...card.querySelectorAll('.remediation_actions .chip')].map(c =>
          c.textContent.replace('×', '').trim()
        );

      switch (cat) {
        case 'api_health':
          return {
            alert_source: get('alert_source'),
            endpoint_name: get('endpoint_name'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            endpoint_url: get('endpoint_url'),
            check_type: get('check_type'),
            expected_status_codes: get('expected_codes'),
            latency_threshold_ms: num('latency_ms'),
            check_frequency_sec: num('check_frequency'),
            alert_priority: get('alert_priority'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            monitoring_interval: get('monitoring_interval'),
            remediation_actions: chips()
          };

        case 'exception':
          return {
            alert_source: get('alert_source'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            index_name: get('index_name'),
            timestamp_field: get('timestamp_field'),
            monitoring_fields: get('monitoring_fields'),
            monitoring_interval: get('monitoring_interval'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            sample_query: get('sample_query'),
            alert_priority: get('alert_priority'),
            remediation_actions: chips()
          };

        case 'infrastructure':
          return {
            alert_source: get('alert_source'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            dashboard_name: get('dashboard_name'),
            panel_name: get('panel_name'),
            datasource: get('datasource'),
            metric_query: get('metric_query'),
            threshold_value: num('threshold_value'),
            threshold_unit: get('threshold_unit'),
            evaluation_interval: get('evaluation_interval'),
            alert_priority: get('alert_priority'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            remediation_actions: chips()
          };

        case 'log':
          return {
            alert_source: get('alert_source'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            index_name: get('index_name'),
            timestamp_field: get('timestamp_field'),
            monitoring_fields: get('monitoring_fields'),
            monitoring_interval: get('monitoring_interval'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            sample_query: get('sample_query'),
            threshold_count: num('threshold_count'),
            threshold_period_min: num('threshold_period'),
            alert_priority: get('alert_priority'),
            remediation_actions: chips()
          };

        case 'aws_services':
          return {
            alert_source: get('alert_source'),
            service_name: get('service_name'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            metric_name: get('metric_name'),
            namespace: get('namespace'),
            alert_condition: get('alert_condition'),
            threshold: num('threshold'),
            comparison_operator: get('comparison_operator'),
            alert_priority: get('alert_priority'),
            remediation_action: chips()
          };

        case 'queue':
          return {
            alert_source: get('alert_source'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            queue_name: get('queue_name'),
            index_name: get('index_name'),
            threshold_value: num('threshold_value'),
            threshold_unit: get('threshold_unit'),
            monitoring_interval: get('monitoring_interval'),
            alert_priority: get('alert_priority'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            remediation_action: chips()
          };

        case 'alb':
          return {
            alert_source: get('alert_source'),
            alert_action: get('alert_action'),
            alert_channel: get('alert_channel'),
            alert_owner: get('alert_owner'),
            alb_name: get('alb_name'),
            metric_name: get('metric_name'),
            threshold_value: num('threshold_value'),
            threshold_unit: get('threshold_unit'),
            evaluation_interval: get('evaluation_interval'),
            alert_priority: get('alert_priority'),
            alert_condition: get('alert_condition'),
            alert_reason: get('alert_reason'),
            athena_query: get('athena_query'),
            remediation_action: chips()
          };
      }
    });
  }


  /* ============================================================
     UTILITIES
  ============================================================ */

  function elVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"'`=\/]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '/': '&#x2F;',
      '`': '&#x60;', '=': '&#x3D;'
    })[ch]);
  }

  function isValidUrl(str) {
  try {
    const u = new URL(str);
    return !!u.protocol;
  } catch (e) { return false; }
}


  function isValidTimestamp(str) {
    const re = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!re.test(str)) return false;
    const [d, t] = str.split(' ');
    const [y, m, da] = d.split('-').map(Number);
    const [hh, mm, ss] = t.split(':').map(Number);
    const dt = new Date(y, m - 1, da, hh, mm, ss);
    return (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === da &&
      dt.getHours() === hh &&
      dt.getMinutes() === mm &&
      dt.getSeconds() === ss
    );
  }

  // Convert datetime-local → formatted string
  const lastValEl = document.getElementById('last_validated_on');
  const lastFmt = document.getElementById('last_validated_on_fmt');

  function formattedLastValidatedOn() {
    if (!lastValEl || !lastValEl.value) return '';
    const d = new Date(lastValEl.value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  if (lastValEl) {
    lastValEl.addEventListener('change', () => {
      lastFmt.textContent = formattedLastValidatedOn() || 'YYYY-MM-DD HH:MM:SS';
    });
  }


/* ============================================================
     VALIDATE + COPY JSON + DOWNLOAD JSON
============================================================ */

/* VALIDATE JSON (using shared-validator.js) */
document.getElementById("validateJsonBtn").onclick = () => {
    const output = document.getElementById("json_output");
    const errorsBox = document.getElementById("json_errors");
    const downloadBtn = document.getElementById("download_btn");

    // Always rebuild JSON before validating
    const json = buildJSON();

    let jsonObj;
    try {
        jsonObj = JSON.parse(output.textContent || "{}");
    } catch (err) {
        errorsBox.innerHTML = `<div class="error-list" style="color:#dc2626;">Invalid JSON format</div>`;
        downloadBtn.disabled = true;
        return;
    }

    // Validate with shared validator
    const errors = validateJSON(jsonObj, "release_monitoring");

    errorsBox.innerHTML = ""; // Clear old messages

    if (errors.length === 0) {
        errorsBox.innerHTML = `<div class="valid-ok">JSON is valid ✔ Ready to download.</div>`;
        downloadBtn.disabled = false;

        // Ensure review step is visible
        if (typeof showStep === "function") showStep(4);

    } else {
        downloadBtn.disabled = true;

        errorsBox.innerHTML = `
            <div class="error-list" style="color:#dc2626; margin-bottom:6px;">
                Validation failed — please fix the issues below.
            </div>
        `;

        const ul = document.createElement("ul");
        ul.className = "error-list";

        errors.forEach(e => {
            const li = document.createElement("li");
            li.textContent = e;
            ul.appendChild(li);
        });

        errorsBox.appendChild(ul);

        if (typeof showStep === "function") showStep(4);
    }
};


/* COPY JSON */
document.getElementById("copyBtn").addEventListener("click", () => {
    const btn = document.getElementById("copyBtn");

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

    // Prevent download if user did NOT validate
    if (downloadBtn.disabled) {
        errorsBox.innerHTML = `
            <div style="color:#b91c1c; font-weight:500;">
                Please validate the JSON before downloading.
            </div>
        `;
        if (typeof showStep === "function") showStep(4);
        return;
    }

    // Rebuild JSON once more before download
    buildJSON();

    const text = document.getElementById("json_output").textContent;
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "release_monitoring.json";
    a.click();
});


})();
