/* ============================================================
   SHARED JSON VALIDATOR — Used by ALL release builder tools
   validateJSON(json, fileType) → returns array of error strings
============================================================ */

/* --------------------------
   PUBLIC API
-------------------------- */
function validateJSON(json, fileType) {
    if (!json || typeof json !== "object") {
        return ["Invalid JSON object"];
    }

    switch (fileType) {
        case "release_notes":
            return validateReleaseNotes(json);

        case "release_tags":
            return validateReleaseTags(json);

        case "release_instructions":
            return validateReleaseInstructions(json);

        case "release_monitoring":
            return validateReleaseMonitoring(json);

        default:
            return ["Unknown file_type: " + fileType];
    }
}


/* ============================================================
   VALIDATOR: RELEASE NOTES
============================================================ */
function validateReleaseNotes(j) {
    const errors = [];

    // required fields
    const required = [
        ["release_version", "Missing release_version"],
        ["release_date", "Missing release_date"],
        ["release_type", "Missing release_type"],
        ["release_summary", "Missing release_summary"],
        ["release_manager", "Missing release_manager"],

        ["vulerability_scan", "Missing vulnerability_scan"],
        ["security_approval_status", "Missing security_approval_status"],
        ["Cross_tenant_dataleak_check", "Missing data leak check"],

        ["impact_info", "Missing impact_info"],
        ["modules", "Missing modules section"],
        ["quality_assurance", "Missing quality_assurance"],
        ["testing_stages", "Missing testing_stages"],
        ["test_automation", "Missing test_automation"],
    ];

    required.forEach(([key, msg]) => {
        if (!j[key] && j[key] !== 0) errors.push(msg);
    });

    // email format
    if (j.release_manager && !isValidCiscoEmail(j.release_manager)) {
        errors.push("release_manager must be a valid @cisco.com email");
    }

    // modules
    if (Array.isArray(j.modules)) {
        j.modules.forEach((m, idx) => {
            if (!m.namespace) errors.push(`Module ${idx + 1}: missing namespace`);
            if (!m.jira_ref) errors.push(`Module ${idx + 1}: missing jira_ref`);
            if (!m.owner) errors.push(`Module ${idx + 1}: missing owner`);
            if (m.owner && !isValidCiscoEmail(m.owner))
                errors.push(`Module ${idx + 1}: owner invalid email`);
            if (!m.repo) errors.push(`Module ${idx + 1}: missing repo`);
            if (m.repo && !isValidURL(m.repo))
                errors.push(`Module ${idx + 1}: repo must be a valid URL`);
        });
    }

    return errors;
}


/* ============================================================
   VALIDATOR: RELEASE TAGS
============================================================ */
function validateReleaseTags(j) {
    const errors = [];

    const requiredTop = [
        ["release_version", "Missing release_version"],
        ["release_date", "Missing release_date"],
        ["release_type", "Missing release_type"],
        ["release_manager", "Missing release_manager"],
        ["namespaces", "Missing namespaces object"]
    ];
    requiredTop.forEach(([k, m]) => (!j[k] ? errors.push(m) : null));

    if (j.release_manager && !isValidCiscoEmail(j.release_manager)) {
        errors.push("release_manager must be a valid @cisco.com email");
    }

    // validate namespaces
    if (typeof j.namespaces === "object") {
        for (const ns in j.namespaces) {
            const block = j.namespaces[ns];
            if (!block.jira_ref) errors.push(`Namespace ${ns}: Missing jira_ref`);
            if (!Array.isArray(block.components))
                errors.push(`Namespace ${ns}: components must be array`);
            else {
                block.components.forEach((c, idx) => {
                    if (!c.component_name)
                        errors.push(`Namespace ${ns}, component ${idx + 1}: Missing component_name`);
                    if (!c.component_tag)
                        errors.push(`Namespace ${ns}, component ${idx + 1}: Missing component_tag`);
                });
            }
        }
    }

    return errors;
}


/* ============================================================
   VALIDATOR: RELEASE INSTRUCTIONS
============================================================ */
function validateReleaseInstructions(j) {
    const errors = [];

    const req = [
        ["release_version", "Missing release_version"],
        ["release_date", "Missing release_date"],
        ["release_by", "Missing release_by"],
        ["manual_changes", "Missing manual_changes array"]
    ];
    req.forEach(([k, m]) => (!j[k] ? errors.push(m) : null));

    if (j.release_by && !isValidCiscoEmail(j.release_by)) {
        errors.push("release_by must be a valid @cisco.com email");
    }

    if (Array.isArray(j.manual_changes)) {
        j.manual_changes.forEach((c, idx) => {
            const prefix = `Instruction ${idx + 1}: `;

            if (!c.sequence_id) errors.push(prefix + "Missing sequence_id");
            if (!c.phase) errors.push(prefix + "Missing phase");
            if (!c.category) errors.push(prefix + "Missing category");
            if (!c.description) errors.push(prefix + "Missing description");
            if (!c.namespaces) errors.push(prefix + "Missing namespaces");

            if (!Array.isArray(c.components) || c.components.length === 0)
                errors.push(prefix + "Missing components");

            if (!Array.isArray(c.execution_steps) || c.execution_steps.length === 0)
                errors.push(prefix + "Missing execution_steps");

            if (!Array.isArray(c.validation_steps) || c.validation_steps.length === 0)
                errors.push(prefix + "Missing validation_steps");

            if (c.rollback_possible === "true") {
                if (!Array.isArray(c.rollback_steps) || c.rollback_steps.length === 0)
                    errors.push(prefix + "rollback_steps required because rollback_possible is true");
            }
        });
    }

    return errors;
}


/* ============================================================
   VALIDATOR: RELEASE MONITORING
============================================================ */
function validateReleaseMonitoring(j) {
    const errors = [];

    const top = [
        ["release_version", "Missing release_version"],
        ["release_date", "Missing release_date"],
        ["environment", "Missing environment"],
        ["monitored_by", "Missing monitored_by"],
        ["monitoring_categories", "Missing monitoring_categories"]
    ];
    top.forEach(([k, m]) => (!j[k] ? errors.push(m) : null));


    const cats = j.monitoring_categories || {};

    validateMonitoringCategory(errors, cats.api_health_monitoring, "API Health", validateApiEntry);
    validateMonitoringCategory(errors, cats.exception_monitoring, "Exception", validateExceptionEntry);
    validateMonitoringCategory(errors, cats.infrastructure_monitoring, "Infrastructure", validateInfraEntry);
    validateMonitoringCategory(errors, cats.log_monitoring, "Log", validateLogEntry);
    validateMonitoringCategory(errors, cats.aws_services_monitoring, "AWS Services", validateAwsEntry);
    validateMonitoringCategory(errors, cats.queue_monitoring, "Queue", validateQueueEntry);
    validateMonitoringCategory(errors, cats.alb_exceptions, "ALB Exceptions", validateAlbEntry);

    // validation summary
    const vs = j.validation_summary || {};
    if (!vs.validated_by) errors.push("Validation Summary: validated_by is required");
    if (!vs.validation_status) errors.push("Validation Summary: validation_status is required");

    if (vs.last_validated_on && !isValidTimestamp(vs.last_validated_on)) {
        errors.push("Validation Summary: last_validated_on must be YYYY-MM-DD HH:MM:SS");
    }

    return errors;
}


/* ============================================================
   PER-CATEGORY ENTRY VALIDATORS (Monitoring)
============================================================ */

function validateMonitoringCategory(errors, arr, label, fn) {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry, idx) => {
        const e = fn(entry, idx + 1);
        errors.push(...e);
    });
}

function validateApiEntry(e, i) {
    const errs = [], p = `API Entry ${i}: `;

    if (!e.endpoint_name) errs.push(p + "endpoint_name required");
    if (!["HTTP", "HTTPS"].includes(e.check_type)) errs.push(p + "check_type must be HTTP/HTTPS");
    if (!e.endpoint_url || !isValidURL(e.endpoint_url)) errs.push(p + "endpoint_url invalid");
    if (!Array.isArray(e.remediation_actions) || e.remediation_actions.length === 0)
        errs.push(p + "remediation_actions required");

    return errs;
}

function validateExceptionEntry(e, i) {
    const errs = [], p = `Exception Entry ${i}: `;
    if (!e.index_name) errs.push(p + "index_name required");
    if (!e.timestamp_field) errs.push(p + "timestamp_field required");
    return errs;
}

function validateInfraEntry(e, i) {
    const errs = [], p = `Infra Entry ${i}: `;
    if (!e.dashboard_name) errs.push(p + "dashboard_name required");
    if (!e.panel_name) errs.push(p + "panel_name required");
    if (!e.metric_query) errs.push(p + "metric_query required");
    return errs;
}

function validateLogEntry(e, i) {
    const errs = [], p = `Log Entry ${i}: `;
    if (!e.index_name) errs.push(p + "index_name required");
    if (!e.timestamp_field) errs.push(p + "timestamp_field required");
    return errs;
}

function validateAwsEntry(e, i) {
    const errs = [], p = `AWS Entry ${i}: `;
    if (!e.metric_name) errs.push(p + "metric_name required");
    if (!e.namespace) errs.push(p + "namespace required");
    if (e.threshold == null) errs.push(p + "threshold required");
    if (!e.comparison_operator) errs.push(p + "comparison_operator required");
    return errs;
}

function validateQueueEntry(e, i) {
    const errs = [], p = `Queue Entry ${i}: `;
    if (!e.queue_name) errs.push(p + "queue_name required");
    if (!e.index_name) errs.push(p + "index_name required");
    if (e.threshold_value == null) errs.push(p + "threshold_value required");
    if (!e.threshold_unit) errs.push(p + "threshold_unit required");
    return errs;
}

function validateAlbEntry(e, i) {
    const errs = [], p = `ALB Entry ${i}: `;
    if (!e.alb_name) errs.push(p + "alb_name required");
    if (!e.metric_name) errs.push(p + "metric_name required");
    if (e.threshold_value == null) errs.push(p + "threshold_value required");
    return errs;
}


/* ============================================================
   LOW-LEVEL UTILITIES
============================================================ */
function isValidURL(str) {
    try {
        const u = new URL(str);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function isValidCiscoEmail(email) {
    return /^[^\s@]+@cisco\.com$/i.test(email);
}

function isValidTimestamp(str) {
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str);
}
